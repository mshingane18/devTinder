const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://shinganemahesh18_db_user:HsiFtbtZE3hxycp5@namastenode.rt8tzge.mongodb.net/devTinder",
  );
};

module.exports = connectDB;
