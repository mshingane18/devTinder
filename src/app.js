const express = require("express");
const connectDB = require("./config/database");
const User = require("./models/user");
const validateSignUp = require("./utils/validation");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.json());

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
app.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    // check if the email is exist in our Db
    const user = User.findOne({ emailId: username });
    if (!user) {
      throw new Error("Invalid Credentials");
    }

    const isValidUser = bcrypt.compare(password, user.password);
    if (isValidUser) {
      res.send("Logged in successfully.");
    } else {
      throw new Error("Invalid Credentials");
    }
  } catch (err) {
    throw new Error("Error: " + err.message);
  }
});

// find by id
app.get("/userbyid", async (req, res) => {
  console.log(req.query.id);
  const id = req.query.id;
  try {
    const user = await User.findById(id);
    console.log(user);
    if (user !== null) {
      res.status(200).send(user);
    } else {
      res.status(404).send("User not found of id: ", id);
    }
  } catch (err) {
    res.status(502).send("Something went wrong....");
  }
});

//findone
app.get("/userone", async (req, res) => {
  const userEmail = req.query.emailId;
  console.log(userEmail);
  try {
    const user = await User.findOne({ emailId: userEmail });
    if (user.length === 0) {
      res.status(404).send("User not found...");
    } else {
      res.send(user);
    }
  } catch (err) {
    res.status(502).send("Something went wrong....");
  }
});

// get user by emailId
app.get("/user", async (req, res) => {
  console.log("userEmail:" + req.query.emailId);
  const userEmail = req.query.emailId;
  try {
    const user = await User.find({ emailId: userEmail });
    if (user.length === 0) {
      res.status(404).send("User not found...");
    } else {
      res.send(user);
    }
  } catch (err) {
    res.status(502).send("Something went wrong...." + err.message);
  }
});

//get all user as feed
app.get("/feed", async (req, res) => {
  try {
    const user = await User.find({});
    if (user.length === 0) {
      res.status(404).send("User not found...");
    } else {
      res.send(user);
    }
  } catch (err) {
    res.status(502).send("Something went wrong....");
  }
});

// delete user by id
app.delete("/user/:id", async (req, res) => {
  console.log(req.params);
  const userId = req.params.id;
  try {
    const user = await User.findByIdAndDelete(userId);
    console.log("user: ", user);
    res.status(200).send("User deleted succesfully..");
  } catch (err) {
    res.status(502).send("Something went wrong....");
  }
});

//update user by ID
app.patch("/user/:id", async (req, res) => {
  const userId = req.params?.id;
  const data = req.body;
  try {
    const AllowedUpdates = ["age", "skills", "photoUrl", "about"];
    const isUpdateAllowed = Object.keys(data).every((k) =>
      AllowedUpdates.includes(k),
    );
    if (!isUpdateAllowed) throw new Error("updates not allowed");
    if (data.skills && data.skills.length > 10) {
      throw new Error("Skills should be less than 10");
    }

    const user = await User.findByIdAndUpdate(userId, data, {
      returnDocument: "after",
      runValidators: true,
    });
    res.send(user);
  } catch (err) {
    res.status(502).send("Error occured." + err.message);
  }
});

// update user by emailId
app.patch("/userByEmail/:email", async (req, res) => {
  const email = req.params.email;
  const data = req.body;
  try {
    const user = await User.findOneAndUpdate({ emailId: email }, data);
    res.send("Updated user successfully...");
  } catch (err) {
    res.status(502).send("Something went wrong....");
  }
});

connectDB().then(() => {
  console.log("connection established!!!...");
  app.listen(3000, () => {
    console.log("server is running on http://localhost:3000");
  });
});
