const socketIO = require("socket.io");
const { allowedOrigins } = require("./constants");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Chat = require("../models/chat");
const User = require("../models/user");
const connectionRequest = require("../models/connectionRequest");

const initilizeSocket = (server) => {
  const onlineUsers = new Map();

  const getSecretRoomId = (userId1, connectionId) => {
    return crypto
      .createHash("sha256")
      .update([String(userId1), String(connectionId)].sort().join("$"))
      .digest("hex");
  };

  const io = socketIO(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.headers.cookie
        ?.split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("token="))
        ?.slice("token=".length);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const { _id } = jwt.verify(
        decodeURIComponent(token),
        process.env.JWT_SECRET,
      );
      const user = await User.findById(_id).select("_id firstName photoUrl");
      if (!user) {
        return next(new Error("User does not exist"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Invalid authentication"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    const userSockets = onlineUsers.get(userId) ?? new Set();
    userSockets.add(socket.id);
    onlineUsers.set(userId, userSockets);
    socket.data.chatRooms = new Set();

    socket.on("joinChat", async ({ connectionId }) => {
      try {
        if (!connectionId) return;
        const connection = await connectionRequest.findOne({
          $or: [
            { fromUserId: userId, toUserId: connectionId, status: "accepted" },
            { fromUserId: connectionId, toUserId: userId, status: "accepted" },
          ],
        });
        if (!connection) return;

        const roomId = getSecretRoomId(userId, connectionId);
        socket.join(roomId);
        socket.data.chatRooms.add(roomId);

        const chat = await Chat.findOne({
          participants: { $all: [userId, connectionId] },
        });
        const deliveredMessageIds = [];
        if (chat) {
          const deliveredAt = new Date();
          let changed = false;
          chat.messages.forEach((message) => {
            if (String(message.receiverId) === userId && !message.deliveredAt) {
              message.deliveredAt = deliveredAt;
              deliveredMessageIds.push(String(message._id));
              changed = true;
            }
          });
          if (changed) await chat.save();
        }

        const connectedUser =
          await User.findById(connectionId).select("lastSeenAt");
        io.to(roomId).emit("presence", {
          userId: String(connectionId),
          online: onlineUsers.has(String(connectionId)),
          lastSeenAt: connectedUser?.lastSeenAt ?? null,
        });
        if (deliveredMessageIds.length > 0) {
          io.to(roomId).emit("messageStatus", {
            messageIds: deliveredMessageIds,
            status: "delivered",
          });
        }
      } catch (error) {
        console.error("Error joining chat:", error);
      }
    });

    socket.on(
      "sendMessage",
      async ({ connectionId, text, clientMessageId }) => {
        try {
          const trimmedText = text?.trim();
          if (!userId || !connectionId || !trimmedText) return;
          const roomId = getSecretRoomId(userId, connectionId);

          const connection = await connectionRequest.findOne({
            $or: [
              {
                fromUserId: userId,
                toUserId: connectionId,
                status: "accepted",
              },
              {
                fromUserId: connectionId,
                toUserId: userId,
                status: "accepted",
              },
            ],
          });
          if (!connection) {
            return;
          }
          let chat = await Chat.findOne({
            participants: { $all: [userId, connectionId] },
          });

          if (!chat) {
            chat = new Chat({
              participants: [userId, connectionId],
              messages: [],
            });
          }
          chat.messages.push({
            senderId: userId,
            receiverId: connectionId,
            text: trimmedText,
            deliveredAt:
              io.sockets.adapter.rooms.get(roomId)?.size > 1
                ? new Date()
                : null,
          });
          await chat.save();
          const savedMessage = chat.messages[chat.messages.length - 1];
          io.to(roomId).emit("receiveMessage", {
            firstName: socket.user.firstName,
            userId: String(userId),
            text: trimmedText,
            messageId: String(savedMessage._id),
            clientMessageId,
            createdAt: savedMessage.createdAt,
            status: savedMessage.deliveredAt ? "delivered" : "sent",
          });
        } catch (error) {
          console.error("Error sending message:", error);
        }
      },
    );

    socket.on("typing", ({ connectionId }) => {
      const roomId = getSecretRoomId(userId, connectionId);
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit("typing", {
        userId,
        firstName: socket.user.firstName,
      });
      socket.to(roomId).emit("presence", {
        userId,
        online: true,
        lastSeenAt: null,
      });
    });

    socket.on("stopTyping", ({ connectionId }) => {
      const roomId = getSecretRoomId(userId, connectionId);
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit("stopTyping", { userId });
    });

    socket.on("markRead", async ({ connectionId }) => {
      try {
        const roomId = getSecretRoomId(userId, connectionId);
        if (!socket.rooms.has(roomId)) return;
        const chat = await Chat.findOne({
          participants: { $all: [userId, connectionId] },
        });
        if (!chat) return;

        const readAt = new Date();
        const messageIds = [];
        chat.messages.forEach((message) => {
          if (
            String(message.senderId) === String(connectionId) &&
            String(message.receiverId) === userId &&
            !message.readAt
          ) {
            message.readAt = readAt;
            message.deliveredAt ??= readAt;
            messageIds.push(String(message._id));
          }
        });
        if (messageIds.length === 0) return;
        await chat.save();
        io.to(roomId).emit("messageStatus", {
          messageIds,
          status: "read",
        });
      } catch (error) {
        console.error("Error marking messages read:", error);
      }
    });

    socket.on("disconnect", async () => {
      const sockets = onlineUsers.get(userId);
      sockets?.delete(socket.id);
      if (sockets?.size) return;
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { lastSeenAt: new Date() });
      socket.data.chatRooms.forEach((roomId) => {
        socket.to(roomId).emit("presence", {
          userId,
          online: false,
          lastSeenAt: new Date().toISOString(),
        });
      });
    });
  });
};

module.exports = initilizeSocket;
