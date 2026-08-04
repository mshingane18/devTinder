const validator = require("validator");

const validateSignUp = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName || !lastName) {
    throw new Error("Enter valid name.");
  } else if (!validator.isEmail(emailId)) {
    throw new Error("Enter valid email.");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error(
      "Your password is not strong. Password must contain { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1, returnScore: false, pointsPerUnique: 1, pointsPerRepeat: 0.5, pointsForContainingLower: 10, pointsForContainingUpper: 10, pointsForContainingNumber: 10, pointsForContainingSymbol: 10 }",
    );
  }
};
const validateProfileEditFields = (req) => {
  const isAllowedEditFields = [
    "firstName",
    "lastName",
    "emailId",
    "age",
    "gender",
    "photoUrl",
    "about",
    "skills",
  ];

  const isEditable = Object.keys(req.body).every((field) =>
    isAllowedEditFields.includes(field),
  );
  return isEditable;
};
module.exports = { validateSignUp, validateProfileEditFields };
