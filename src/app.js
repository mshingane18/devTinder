const express = require("express");

const app = express();

const { authAdmin, userAuth } = require("./middleware/auth");

app.use("/admin", authAdmin);

app.post("/user/login", (req, res) => {
  // throw new Error("anjkcbkasbdc");
  res.send("Logged in succesfully....");
});

app.get("/user/getAllUser", userAuth, (req, res) => {
  try {
    throw new Error("anjkcbkasbdc");
    res.send("All users list!!....");
  } catch (error) {
    res.status(500).send("Error!! contact your administraitor!!!!");
  }
});

app.get("/admin/getAllData", (req, res) => {
  res.send("All data!!....");
});

app.get("/admin/deleteAllData", (req, res) => {
  res.send("Deleted all data!!...");
});

app.use("/", (error, req, res, next) => {
  if (error) {
    res.status(500).send("something went wrong....");
  }
});

app.listen(3000, () => {
  console.log("server is running on http://localhost:3000");
});
