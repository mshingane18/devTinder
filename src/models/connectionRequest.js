const mongoose = require("mongoose");
const { schema } = require("./user");

const ConnectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["interested", "ignored", "accepted", "rejected"],
        message: "{VALUE} is not supported!!",
      },
    },
  },
  { timestamps: true },
);

ConnectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

ConnectionRequestSchema.pre("save", function () {
  const connectionRequest = this;
  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new Error("You can not send request to yourself!!");
  }
});

module.exports = mongoose.model("ConnectionRequest", ConnectionRequestSchema);
