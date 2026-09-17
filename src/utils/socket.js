const socketIO = require("socket.io");
const { allowedOrigins } = require("./constants");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Chat = require("../models/chat");
const User = require("../models/user");
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
    socket.on("joinChat", async ({ connectionId }) => {
      try {
        const userId = socket.user._id;
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
      } catch (error) {
        console.error("Error joining chat:", error);
      }
    });

    socket.on("sendMessage", async ({ connectionId, text }) => {
      try {
        const userId = socket.user._id;
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
          firstName: socket.user.firstName,
          userId: String(userId),
          text: trimmedText,
          messageId: String(savedMessage._id),
          createdAt: savedMessage.createdAt,
        });
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on("disconnect", () => {});
  });
};

module.exports = initilizeSocket;
