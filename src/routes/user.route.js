const Router = require("express");
const {
  createUser,
  getUserDetailsById,
  getUsers,
  updateUserDetailsById,
  getUsersAccountStatus,
  loginUser,
  getCalendersData,
  logout,
  updateUserStatus,
  chartForProofReadingData,
  chartForAssignmentData,
  chartForProofReadingDataAdmin,
  chartForAssignmentDataAdmin,
  updateNotification,
  addEditorByAdmin,
  uploadImage,
  verifyRecaptcha,
  adminLoginToUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/user.controller.js");
const createToken = require("../utils/jwtToken.js");
const multer = require("multer");
const userRoute = Router();
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './profileImage')
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//     cb(null, file.fieldname + '-' + uniqueSuffix)
//   }
// })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./profileImage");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Create the multer instance
const upload = multer({ storage: storage });

userRoute.post("/signup", createUser);
userRoute.post("/login", loginUser);
userRoute.get("/logout", logout);
userRoute.get("/users", getUsers);
userRoute.post("/forgotPassword", forgotPassword);
userRoute.post("/resetPassword/:token", resetPassword);
userRoute.put("/updateProfile", upload.none(), updateUserDetailsById);
userRoute.put("/updateImage", upload.single("file"), uploadImage);
userRoute.get("/user/:id", getUserDetailsById);
userRoute.post("/users/adminLoginToUser", adminLoginToUser);
userRoute.get("/users/usersAccountStatus", getUsersAccountStatus);
userRoute.get("/users/proofreadingChart/:userId", chartForProofReadingData);
userRoute.get("/users/assignmentChart/:userId", chartForAssignmentData);
userRoute.get("/users/updateNotification", updateNotification);
userRoute.get("/admin/calenders/:month", getCalendersData);
userRoute.put("/admin/userManagment", updateUserStatus);
userRoute.get(
  "/admin/chartForProofReadingDataAdmin",
  chartForProofReadingDataAdmin
);
userRoute.get(
  "/admin/chartForAssignmentDataAdmin",
  chartForAssignmentDataAdmin
);
userRoute.post("/verifyRecaptcha", verifyRecaptcha);
userRoute.post("/admin/addEditorByAdmin", addEditorByAdmin);
module.exports = userRoute;
