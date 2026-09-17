const express = require("express");
const Chat = require("../models/chat");
const { userAuth } = require("../middleware/auth");

const chatRouter = express.Router();

chatRouter.get("/chat/:connectionId", userAuth, async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.user?._id;
  try {
    let chat = await Chat.findOne({
      participants: { $all: [userId, connectionId] },
    }).populate("messages.senderId", "firstName lastName photoUrl");
    if (!chat) {
      chat = new Chat({
        participants: [userId, connectionId],
        messages: [],
      });
      await chat.save();
    }
    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = chatRouter;
