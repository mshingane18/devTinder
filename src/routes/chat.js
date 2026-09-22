const express = require("express");
const mongoose = require("mongoose");
const Chat = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");
const { userAuth } = require("../middleware/auth");

const chatRouter = express.Router();

chatRouter.get("/chat/unread-count", userAuth, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id }).select(
      "participants messages",
    );
    const unreadCount = chats.reduce(
      (total, chat) =>
        total +
        chat.messages.filter(
          (message) =>
            String(message.receiverId) === String(req.user._id) &&
            !message.readAt,
        ).length,
      0,
    );
    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

chatRouter.get("/chat/unread-counts", userAuth, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id }).select(
      "participants messages",
    );
    const unreadCounts = {};

    chats.forEach((chat) => {
      const otherUserId = chat.participants.find(
        (participant) => String(participant) !== String(req.user._id),
      );
      if (!otherUserId) return;

      const unreadForConnection = chat.messages.filter(
        (message) =>
          String(message.receiverId) === String(req.user._id) &&
          !message.readAt,
      ).length;

      if (unreadForConnection > 0) {
        unreadCounts[String(otherUserId)] = unreadForConnection;
      }
    });

    res.json({ counts: unreadCounts });
  } catch (error) {
    console.error("Error fetching unread counts by connection:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

chatRouter.get("/chat/:connectionId", userAuth, async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.user?._id;
  try {
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ message: "Invalid connection" });
    }

    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: connectionId, status: "accepted" },
        { fromUserId: connectionId, toUserId: userId, status: "accepted" },
      ],
    });
    if (!connection) {
      return res.status(403).json({ message: "You are not connected" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
    const before = req.query.before ? new Date(req.query.before) : null;
    let chat = await Chat.findOne({
      participants: { $all: [userId, connectionId] },
    });
    if (!chat) {
      chat = new Chat({
        participants: [userId, connectionId],
        messages: [],
      });
      await chat.save();
    }

    await chat.populate("messages.senderId", "firstName lastName photoUrl");
    const sortedMessages = [...chat.messages].sort(
      (first, second) => first.createdAt - second.createdAt,
    );
    const olderMessages = before
      ? sortedMessages.filter((message) => message.createdAt < before)
      : sortedMessages;
    const pageMessages = olderMessages.slice(-limit);
    const unreadCount = chat.messages.filter(
      (message) =>
        String(message.receiverId) === String(userId) && !message.readAt,
    ).length;

    res.json({
      messages: pageMessages,
      pagination: {
        hasMore: olderMessages.length > pageMessages.length,
        oldestMessageAt: pageMessages[0]?.createdAt ?? null,
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = chatRouter;
