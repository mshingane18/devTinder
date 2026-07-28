const express = require("express");

const app = express();

app.get("/user", (req, res) => {
  console.log(req.query);
  res.send({ firstname: "Mahesh", lastname: "Shingane" });
});

app.post("/user", (req, res) => {
  res.send("Added user succesfully!!");
});

app.delete("/user/:id", (req, res) => {
  console.log(req.params);
  res.send("Deleted user successfully!!");
});

app.put("/user", (req, res) => {
  res.send("updated user sucessfully.");
});

app.get(/^\/ab?c$/, (req, res) => {
  res.send("Matched");
});

app.listen(3000, () => {
  console.log("server is running on http://localhost:3000");
});
