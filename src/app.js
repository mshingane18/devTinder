const express = require("express");
const connectDB = require("./config/database");
const User = require("./models/user");
const validateSignUp = require("./utils/validation");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { userAuth } = require("./middleware/auth");

const app = express();

app.use(express.json());
app.use(cookieParser());

// add user to the collection
app.post("/signup", async (req, res) => {
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
app.post("/login", async (req, res) => {
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

// profile
app.get("/profile", userAuth, async (req, res) => {
  const user = req.user;
  res.send(user);
});

// send connection
app.post("/requestConnect", userAuth, async (req, res) => {
  res.send("connection request sent.");
});

connectDB().then(() => {
  console.log("connection established!!!...");
  app.listen(3000, () => {
    console.log("server is running on http://localhost:3000");
  });
});
