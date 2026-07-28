const express = require("express");

const app = express();

app.use("/", (req, res) => {
  res.send("hello world!");
});

app.use("/test", (req, res) => {
  res.send("Namaste from nodejs express js...");
});

app.use("/hello", (req, res) => {
  res.send("hello hello hello!...");
});

app.listen(3000, () => {
  console.log("server is running on http://localhost:3000");
});
