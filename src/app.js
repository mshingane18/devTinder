const express = require("express");

const app = express();

const { authAdmin, userAuth } = require("./middleware/auth");

app.use("/admin", authAdmin);

app.post("/user/login", (req, res) => {
  res.send("Logged in succesfully....");
});

app.get("/user/getAllUser", userAuth, (req, res) => {
  res.send("All users list!!....");
});

app.get("/admin/getAllData", (req, res) => {
  res.send("All data!!....");
});

app.get("/admin/deleteAllData", (req, res) => {
  res.send("Deleted all data!!...");
});

app.listen(3000, () => {
  console.log("server is running on http://localhost:3000");
});
