const express = require("express");
const connectDB = require("./config/database");
const User = require("./models/user");

const app = express();

app.use(express.json());

app.post("/signup", async (req, res) => {
  console.log(req.body);
  try {
    const user = new User(req.body);
    await user.save();
    res.send("Succesfully created the account...");
  } catch (err) {
    res.status(400).send("Some error occured.", err.message);
  }
});

connectDB().then(() => {
  console.log("connection established!!!...");
  app.listen(3000, () => {
    console.log("server is running on http://localhost:3000");
  });
});
