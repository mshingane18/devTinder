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

    const response = connections.map((data) => {
      if (data.fromUserId._id.equals(longgedInUser._id)) {
        return data.toUserId;
      }
      return data.fromUserId;
    });
    res.json({ response });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  const longgedInUser = req.user;

  const page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
  limit = limit > 50 ? 50 : limit;
  const skip = (page - 1) * limit;

  const connectionRequests = await ConnectionRequest.find({
    $or: [{ fromUserId: longgedInUser._id }, { toUserId: longgedInUser._id }],
  }).select("fromUserId toUserId");

  const hideUsersFromFeed = new Set();
  await connectionRequests.map((data) => {
    hideUsersFromFeed.add(data.fromUserId.toString());
    hideUsersFromFeed.add(data.toUserId.toString());
  });

  const userFeed = await User.find({
    $and: [
      { _id: { $nin: Array.from(hideUsersFromFeed) } },
      { _id: { $ne: longgedInUser._id } },
    ],
  })
    .select(SAFE_USER_DATA)
    .skip(skip)
    .limit(limit);

  res.json({ userFeed });
});
module.exports = userRouter;
