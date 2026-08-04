const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
// send connection
requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const toUserId = req.params.toUserId;
      const fromUserId = req.user._id;
      const status = req.params.status;
      // validate data
      const isAllowedStatus = ["interested", "ignored"];

      if (!isAllowedStatus.includes(status)) {
        throw new Error("Status not supported");
      }
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res.status(400).send({ message: "User not found" });
      }

      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { toUserId, fromUserId },
          { toUserId: fromUserId, fromUserId: toUserId },
        ],
      });

      if (existingConnectionRequest) {
        return res
          .status(400)
          .send({ message: "Connection request already exists." });
      }

      const connectionRequest = new ConnectionRequest({
        toUserId,
        fromUserId,
        status,
      });

      await connectionRequest.save();
      if (status === "interested") {
        res.status(200).send({
          message: `${req.user.firstName} is ${status} in ${toUser.firstName}`,
        });
      } else {
        res.status(200).send({
          message: `${req.user.firstName} ${status} ${toUser.firstName}'s profile.`,
        });
      }
    } catch (err) {
      res.status(400).send("Error: " + err.message);
    }
  },
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const { status, requestId } = req.params;
      const loggedInUser = req.user;

      const AllowedStatus = ["accepted", "rejected"];

      if (!AllowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: `${status} status not supported.` });
      }

      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });

      if (!connectionRequest) {
        return res
          .status(400)
          .json({ message: "connection request not found!!" });
      }
      connectionRequest.status = status;
      const data = await connectionRequest.save();

      res.status(200).json({ message: "Connection request " + status, data });
    } catch (err) {
      res.status(400).send("Error: " + err.message);
    }
  },
);

module.exports = requestRouter;
