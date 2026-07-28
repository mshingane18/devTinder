const authAdmin = (req, res, next) => {
  const token = "xyz";
  const isAuthorized = token === "xyz";
  console.log("checked admin auth: ", isAuthorized);
  if (!isAuthorized) {
    res.status(401).send("Unauthorized access!!...");
  } else {
    next();
  }
};

const userAuth = (req, res, next) => {
  const token = "xyzs";
  const isAuthorized = token === "xyz";
  console.log("checked user auth: ", isAuthorized);
  if (!isAuthorized) {
    res.status(401).send("Unauthorized access!!...");
  } else {
    next();
  }
};
module.exports = { authAdmin, userAuth };
