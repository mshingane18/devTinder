const express = require("express");
const { userAuth } = require("../middleware/auth");
const { validateProfileEditFields } = require("../utils/validation");
const bcrypt = require("bcrypt");

const profileRouter = express.Router();

// profile
profileRouter.get("/profile/view", userAuth, async (req, res) => {
  const user = req.user;
  res.send(user);
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    const isProfileEditAllowed = validateProfileEditFields(req);
    if (!isProfileEditAllowed) {
      throw new Error("Trying to edit immutable fields.");
    }
    const loggedInUser = req.user;
    Object.keys(req.body).every(
      (field) => (loggedInUser[field] = req.body[field]),
    );
    await loggedInUser.save();
    res.json({
      message: `${loggedInUser.firstName}, Your profile updated successfully.`,
      data: loggedInUser,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

profileRouter.patch("/profile/password", userAuth, async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const loggedInUser = req.user;

    if (password === confirmPassword) {
      throw new Error("passwords not matching");
    }
    const passwordHash = await bcrypt.hash(confirmPassword, 10);
    loggedInUser.password = passwordHash;
    await loggedInUser.save();
    res.send("Password updated successfully");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

module.exports = profileRouter;
