const express = require("express");

const app = express();

app.get("/user", (req, res) => {
  res.send({ firstname: "Mahesh", lastname: "Shingane" });
});

app.post("/user", (req, res) => {
  res.send("Added user succesfully!!");
});

app.delete("/user", (req, res) => {
  res.send("Deleted user successfully!!");
});

app.put("/user", (req, res) => {
  res.send("updated user sucessfully.");
});

app.use("/test", (req, res) => {
  res.send("Namaste from nodejs express js...");
});

app.listen(3000, () => {
  console.log("server is running on http://localhost:3000");
});
