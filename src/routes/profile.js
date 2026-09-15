const express = require("express");
const { userAuth } = require("../middleware/auth");
const { validateProfileEditFields } = require("../utils/validation");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const validator = require("validator");
const upload = require("../middleware/upload");

const profileRouter = express.Router();

// profile
profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

profileRouter.patch(
  "/profile/edit",
  userAuth,
  upload.single("photo"),
  async (req, res) => {
    try {
      const isProfileEditAllowed = validateProfileEditFields(req);
      if (!isProfileEditAllowed) {
        throw new Error("Trying to edit immutable fields.");
      }
      const loggedInUser = req.user;
      // If a new photo was uploaded,
      // Cloudinary URL will be available in req.file.path
      console.log("req.file", req.file);
      if (req.file) {
        req.body.photoUrl = req.file.path;
      }
      Object.keys(req.body).every(
        (field) => (loggedInUser[field] = req.body[field]),
      );
      await loggedInUser.save();
      res.json({
        message: `${loggedInUser.firstName}, Your profile updated successfully.`,
        data: loggedInUser,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
);

profileRouter.patch("/profile/password", async (req, res) => {
  try {
    const { emailId, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      throw new Error("passwords not matching");
    }

    if (!validator.isStrongPassword(password)) {
      throw new Error(
        "Your password is not strong. Password must contain { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1, returnScore: false, pointsPerUnique: 1, pointsPerRepeat: 0.5, pointsForContainingLower: 10, pointsForContainingUpper: 10, pointsForContainingNumber: 10, pointsForContainingSymbol: 10 }",
      );
    }

    // check if the email is exist in our Db
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("Invalid Credentials");
    }

    const passwordHash = await bcrypt.hash(confirmPassword, 10);
    user.password = passwordHash;
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

module.exports = profileRouter;
