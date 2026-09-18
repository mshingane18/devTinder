const express = require("express");
const { userAuth } = require("../middleware/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

const userRouter = express.Router();

const SAFE_USER_DATA = "firstName lastName age gender about photoUrl skills";

userRouter.get("/user/request/received", userAuth, async (req, res) => {
  try {
    const longgedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: longgedInUser._id,
      status: "interested",
    }).populate(
      "fromUserId",
      "firstName lastName age gender about photoUrl skills",
    );

    res.json({
      message: "Fetched data successfully",
      data: connectionRequests,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const longgedInUser = req.user;

    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: longgedInUser._id, status: "accepted" },
        { toUserId: longgedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", SAFE_USER_DATA)
      .populate("toUserId", SAFE_USER_DATA);

    const data = connections.map((connection) => {
      if (connection.fromUserId._id.equals(longgedInUser._id)) {
        return connection.toUserId;
      }
      return connection.fromUserId;
    });
    res.status(200).json({ message: "Fetched connection successfully", data });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  const longgedInUser = req.user;

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const requestedLimit = Number.parseInt(req.query.limit, 10) || 10;
  const limit = Math.min(Math.max(requestedLimit, 1), 50);
  const skip = (page - 1) * limit;

  const connectionRequests = await ConnectionRequest.find({
    $or: [{ fromUserId: longgedInUser._id }, { toUserId: longgedInUser._id }],
  })
    .select("fromUserId toUserId")
    .lean();

  const hideUsersFromFeed = new Set();
  hideUsersFromFeed.add(String(longgedInUser._id));
  connectionRequests.forEach((data) => {
    hideUsersFromFeed.add(data.fromUserId.toString());
    hideUsersFromFeed.add(data.toUserId.toString());
  });

  const userFeed = await User.find({
    _id: { $nin: Array.from(hideUsersFromFeed) },
  })
    .select(SAFE_USER_DATA)
    .sort({ _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    message: "Feed fetched successfully",
    userFeed,
  });
});
module.exports = userRouter;
