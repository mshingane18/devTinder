const express = require("express");
const { userAuth } = require("../middleware/auth");
const { validateSignUp } = require("../utils/validation");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const validator = require("validator");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../utils/sendEmail");

const authRouter = express.Router();
const forgotPasswordCooldown = new Map();
const FORGOT_PASSWORD_COOLDOWN_MS = 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 1 * 3600000,
};

// add user to the collection
authRouter.post("/signup", async (req, res) => {
  try {
    // validate the data first
    validateSignUp(req);

    const { firstName, lastName, emailId, password } = req.body;

    if (!validator.isStrongPassword(password)) {
      throw new Error(
        "Your password is not strong. Password must contain { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1, returnScore: false, pointsPerUnique: 1, pointsPerRepeat: 0.5, pointsForContainingLower: 10, pointsForContainingUpper: 10, pointsForContainingNumber: 10, pointsForContainingSymbol: 10 }",
      );
    }

    // encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });
    const data = await user.save();
    const token = await data.getJwtToken();
    res.cookie("token", token, cookieOptions);
    res.status(200).json({
      message: `${firstName} you account is created successfully. Please provide more details in profile.`,
      data,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});

// user login
authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    // check if the email is exist in our Db
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("Invalid Credentials");
    }
    const isValidUser = await user.validatePassword(password);
    if (isValidUser) {
      // create jwt token
      const token = await user.getJwtToken();

      //set cookie with token
      res.cookie("token", token, cookieOptions);
      res.json({
        message: `${user.firstName} you logged in successfully`,
        data: user,
      });
    } else {
      throw new Error("Invalid Credentials");
    }
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});

authRouter.post("/forgot-password", async (req, res) => {
  const genericResponse = {
    message:
      "If an account exists with this email, a password reset link has been sent.",
  };

  try {
    const { emailId } = req.body;
    if (typeof emailId !== "string" || !validator.isEmail(emailId)) {
      return res.status(400).json({ message: "Enter valid email." });
    }

    const normalizedEmail = emailId.toLowerCase().trim();
    const now = Date.now();
    for (const [key, timestamp] of forgotPasswordCooldown) {
      if (now - timestamp >= FORGOT_PASSWORD_COOLDOWN_MS) {
        forgotPasswordCooldown.delete(key);
      }
    }

    const cooldownKeys = [normalizedEmail, `ip:${req.ip}`];
    if (cooldownKeys.some((key) => forgotPasswordCooldown.has(key))) {
      return res.status(200).json(genericResponse);
    }
    cooldownKeys.forEach((key) => forgotPasswordCooldown.set(key, now));

    const user = await User.findOne({ emailId: normalizedEmail });
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user, resetUrl);
    } catch (err) {
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      cooldownKeys.forEach((key) => forgotPasswordCooldown.delete(key));
      console.error("Forgot password email failed:");
      console.error(err);
      return res.status(500).json({
        message: "Unable to send password reset email. Please try again later.",
      });
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("Error in forgot password route:");
    console.error(err);
    return res.status(500).json(genericResponse);
  }
});

authRouter.post("/reset-password/:token", async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset link is invalid or has expired" });
    }

    const { password } = req.body;
    if (typeof password !== "string" || !validator.isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Your password is not strong. Password must contain { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1, returnScore: false, pointsPerUnique: 1, pointsPerRepeat: 0.5, pointsForContainingLower: 10, pointsForContainingUpper: 10, pointsForContainingNumber: 10, pointsForContainingSymbol: 10 }",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully. Please login again.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.send("Logout successfully!!!");
});

module.exports = authRouter;
