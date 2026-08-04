const express = require("express");
const { userAuth } = require("../middleware/auth");
const { validateSignUp } = require("../utils/validation");
const bcrypt = require("bcrypt");
const User = require("../models/user");

const authRouter = express.Router();

// add user to the collection
authRouter.post("/signup", async (req, res) => {
  try {
    // validate the data first
    validateSignUp(req);

    const { firstName, lastName, emailId, password } = req.body;

    // encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });
    await user.save();
    res.send("Succesfully created the account...");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// user login
authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    // check if the email is exist in our Db
    const user = await User.findOne({ emailId: username });
    if (!user) {
      throw new Error("Invalid Credentials");
    }
    const isValidUser = await user.validatePassword(password);
    if (isValidUser) {
      // create jwt token
      const token = await user.getJwtToken();
      res.cookie("token", token, {
        expires: new Date(Date.now() + 1 * 3600000),
      });
      res.send("Logged in successfully.");
    } else {
      throw new Error("Invalid Credentials");
    }
  } catch (err) {
    throw new Error("Error: " + err.message);
  }
});

authRouter.post("/logout", (req, res) => {
  res.cookie("token", null, { expires: new Date(Date.now()) });
  res.send("Logout successfully!!!");
});

module.exports = authRouter;
