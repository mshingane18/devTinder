require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "https://maheshshingane.site",
  "https://www.maheshshingane.site",
  "https://devtinder-web-mnl6.onrender.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);

connectDB().then(() => {
  console.log("connection established!!!...");
  app.listen(process.env.PORT, () => {
    console.log(`server is running on http://localhost:${process.env.PORT}`);
  });
});
