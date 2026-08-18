const express = require("express");
const { userAuth } = require("../middleware/auth");
const { validateSignUp } = require("../utils/validation");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const validator = require("validator");

const authRouter = express.Router();

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
    res.cookie("token", token, {
      expires: new Date(Date.now() + 1 * 3600000),
    });
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
      res.cookie("token", token, {
        sameSite: "none",
        secure: true,
        httpOnly: true,
        expires: new Date(Date.now() + 1 * 3600000),
      });
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

authRouter.post("/logout", (req, res) => {
  res.cookie("token", null, { expires: new Date(Date.now()) });
  res.send("Logout successfully!!!");
});

module.exports = authRouter;
