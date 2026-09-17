const socketIO = require("socket.io");
const { allowedOrigins } = require("./constants");
const crypto = require("crypto");
const Chat = require("../models/chat");
const connectionRequest = require("../models/connectionRequest");

const initilizeSocket = (server) => {
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
    },
  });

  io.on("connection", (socket) => {
    socket.on("joinChat", ({ firstName, userId, connectionId }) => {
      if (!userId || !connectionId) return;
      const roomId = getSecretRoomId(userId, connectionId);
      socket.join(roomId);
    });

    socket.on(
      "sendMessage",
      async ({ firstName, userId, connectionId, text }) => {
        try {
          const trimmedText = text?.trim();
          if (!userId || !connectionId || !trimmedText) return;
          const roomId = getSecretRoomId(userId, connectionId);

          const connections = await connectionRequest.find({
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
          if (connections.length === 0) {
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
          });
          await chat.save();
          const savedMessage = chat.messages[chat.messages.length - 1];
          io.to(roomId).emit("receiveMessage", {
            firstName,
            userId,
            text: trimmedText,
            messageId: String(savedMessage._id),
            createdAt: savedMessage.createdAt,
          });
        } catch (error) {
          console.error("Error sending message:", error);
        }
      },
    );

    socket.on("disconnect", () => {});
  });
};

module.exports = initilizeSocket;
