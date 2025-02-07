const mysqlPool = require("../db/db.js");
const mysqlPool2 = require("../db/wordpressdb.js");
const db = require("../db/db.js");
const bcrypt = require("bcrypt");
const createToken = require("../utils/jwtToken.js");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const {
  mailTemplateForResetPassword,
} = require("../middleware/mailTemplate.js");
const sendMailFunction = require("../utils/nodemailer.js");

const saltVal = 10;
const hashPassword = async (password) => {
  try {
    const hashedPass = await bcrypt.hash(password, saltVal);
    return hashedPass;
  } catch (error) {
    return error;
  }
};
const createUser = async (req, res) => {
  try {
    const { name, email, pass, academicLevel, interest } = req.body;
    let nameArr = name.split(" ");
    const firstname = nameArr[0];
    let lastname = "";
    if (nameArr.length > 1) {
      lastname = name.slice(name.indexOf(" ") + 1);
    }

    const curr_date = new Date();
    const formatted_date =
      curr_date.getFullYear() +
      "-" +
      String(curr_date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(curr_date.getDate()).padStart(2, "0") +
      " " +
      String(curr_date.getHours()).padStart(2, "0") +
      ":" +
      String(curr_date.getMinutes()).padStart(2, "0") +
      ":" +
      String(curr_date.getSeconds()).padStart(2, "0");

    const [duplicateEmail] = await db.query(
      `SELECT * FROM users where email =?`,
      [email]
    );
    if (duplicateEmail.length > 0) {
      return res.status(409).json({
        message: "duplicate email id",
      });
    }
    let hashpass = await hashPassword(pass);
    const user = await db.query(
      `INSERT INTO users(name,lastname,email,pass,academic_level,interest) VALUES(?,?,?,?,?,?)`,
      [firstname, lastname, email, hashpass, academicLevel, interest]
    );
    await mysqlPool2.query(
      `INSERT INTO wpj1_users(user_login ,user_pass,user_nicename ,user_email ,user_url,user_registered,display_name) VALUES(?,?,?,?,?,?,?)`,
      [
        name,
        hashpass,
        name,
        email,
        "https://skylineacademic.com",
        formatted_date,
        name,
      ]
    );
    const wp_user = await mysqlPool2.query(
      `SELECT * FROM wpj1_users WHERE user_email =?`,
      [email]
    );
    const [[{ ID }]] = wp_user;
    await mysqlPool2.query(
      `INSERT INTO wpj1_usermeta (user_id, meta_key, meta_value) VALUES (?, 'account_status', 'approved')`,
      [ID]
    );
    await mysqlPool2.query(
      `INSERT INTO wpj1_usermeta (user_id, meta_key, meta_value) VALUES (?, 'wpj1_capabilities', 'a:1:{s:10:"subscriber";b:1;}')`,
      [ID]
    );

    res.status(201).json({
      message: "user registered successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(error.status || 404).json({
      error: error.message || "Error creating",
    });
  }
};
const verifyRecaptcha = async (req, res) => {
  const { token } = req.body;
  console.log(token);
  const secretKey = "6LcdoZgqAAAAADGD3Dnq9s0SPofeUAETblpz2Dz3"; // Your secret key

  try {

  //   if (token === WHITELISTED_TOKEN) {
  //     return res.json({ success: true, score: 1.0 });
  // }
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: token,
        },
      }
    );
    const { success, score, action } = response.data;

    if (success) {
      res.status(200).json({ success, score, action });
    } else {
      res
        .status(400)
        .json({ success: false, error: "Failed to verify reCAPTCHA" });
    }
  } catch (error) {
    console.error("Axios error:", error.response?.data || error.message);
    res.status(500).json({ error: error });
  }
};

const addEditorByAdmin = async (req, res) => {
  const curr_date = new Date();
  const formatted_date =
    curr_date.getFullYear() +
    "-" +
    String(curr_date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(curr_date.getDate()).padStart(2, "0") +
    " " +
    String(curr_date.getHours()).padStart(2, "0") +
    ":" +
    String(curr_date.getMinutes()).padStart(2, "0") +
    ":" +
    String(curr_date.getSeconds()).padStart(2, "0");

  try {
    const {
      name,
      email,
      academic_level,
      interest,
      city,
      expertise,
      pass,
      admin,
    } = req.body;
    let hashPass = await bcrypt.hash(pass, saltVal);
    await mysqlPool.query(
      `INSERT INTO users (name,email,academic_level,interest,city,accountType,expertise,pass) VALUES (?,?,?,?,?,?,?,?)`,
      [
        name,
        email,
        academic_level,
        interest,
        city,
        "editor",
        expertise,
        hashPass,
      ]
    );
    await mysqlPool2.query(
      `INSERT INTO wpj1_users(user_login ,user_pass,user_nicename ,user_email ,user_url,user_registered,display_name) VALUES(?,?,?,?,?,?,?)`,
      [
        name,
        hashPass,
        name,
        email,
        "https://skylineacademic.com",
        formatted_date,
        name,
      ]
    );
    const wp_user = await mysqlPool2.query(
      `SELECT * FROM wpj1_users WHERE user_email =?`,
      [email]
    );
    const [[{ ID }]] = wp_user;
    await mysqlPool2.query(
      `INSERT INTO wpj1_usermeta (user_id, meta_key, meta_value) VALUES (?, 'account_status', 'approved')`,
      [ID]
    );
    await mysqlPool2.query(
      `INSERT INTO wpj1_usermeta (user_id, meta_key, meta_value) VALUES (?, 'wpj1_capabilities', 'a:1:{s:6:"editor";b:1;}')`,
      [ID]
    );
    res.status(201).json({
      message: "Editor added successFully",
    });
    const message = "Editor Added successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, admin, 0]
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "something went wrong",
    });
  }
};
// login user,admin,editor
const loginUser = async (req, res) => {
  try {
    const { email, pass } = req.body;
    const [user] = await db.query(`SELECT * FROM users where email =?`, [
      email,
    ]);
    if (user.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const isPassMatched = await bcrypt.compare(pass, user[0].pass);
    if (!isPassMatched) {
      return res.status(404).json({
        message: "pass mismatch",
      });
    }
    await createToken(user[0].userId, res);
    res.status(201).json({
      user,
    });
  } catch (error) {
    res.status(error.status || 404).json({
      error: error.message || "Error creating",
    });
  }
};
const adminLoginToUser = async (req, res) => {
  try {
    const { email, pass } = req.body;
    const [user] = await db.query(`SELECT * FROM users where email =?`, [
      email,
    ]);
    if (user.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const isPassMatched = pass == user[0].pass;
    if (!isPassMatched) {
      return res.status(404).json({
        message: "pass mismatch",
      });
    }
    await createToken(user[0].userId, res);
    res.status(201).json({
      user,
    });
  } catch (error) {
    res.status(error.status || 404).json({
      error: error.message || "Error creating",
    });
  }
  console.log("logindone");
};

// logout
const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({
      message: "Successfully logged out",
    });
  } catch (error) {
    res.status(404).json({
      message: "Error logging out",
    });
  }
};
// show all the users
const getUsers = async (req, res) => {
  try {
    const pageNo = req.query.pageNo || 1;
    const limit = 8;
    const offSet = (pageNo - 1) * limit;
    const [totalUsers] = await db.query(
      "SELECT * FROM users where name!= 'admin'"
    );
    const [users] = await db.query(
      "SELECT * FROM users where name!= 'admin' ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offSet]
    );
    const totalPages = Math.ceil(totalUsers.length / 8);
    res.status(200).json({
      totalPages,
      users,
      allusers: totalUsers,
    });
  } catch (error) {
    res.status(error.status || 404).json({
      error: error.message || "Error creating",
    });
  }
};
// show user details
const getUserDetailsById = async (req, res) => {
  try {
    const [userDetails] = await db.query(
      `SELECT  * FROM users WHERE userId=?`,
      [req.params.id]
    );
    res.status(200).json({
      userDetails,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "error while fetching user details",
    });
  }
};
// update user details
const updateUserDetailsById = async (req, res) => {
  const userId = req.body.myid;
  const present = new Date();
  try {
    if (!userId) {
      return res.json({
        message: "user not found with this id",
      });
    }
    const { name, email, password, city, expertise, interest, lastname, bio } =
      req.body;
    if (password) {
      let hashpass = await hashPassword(password);
      await mysqlPool.query(
        `UPDATE users SET name=?, lastname=?,email=?,pass=?,city=?,interest=?,expertise=?,bio=?,updated_at=? where userId=?`,
        [
          name,
          lastname,
          email,
          hashpass,
          city,
          interest,
          expertise,
          bio,
          present,
          userId,
        ]
      );
    } else {
      await mysqlPool.query(
        `UPDATE users SET name=?, lastname=?,email=?,city=?,interest=?,expertise=?,bio=?,updated_at=? where userId=?`,
        [name, lastname, email, city, interest, expertise, bio, present, userId]
      );
    }

    const message = "Profile Updated successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    console.log("done");
    res.status(200).json({
      message: "user details updated successfully",
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "error while updating user details",
    });
  }
};

const uploadImage = async (req, res) => {
  const userId = req.body.myid;
  let filePath = "";
  if (req.file) {
    filePath = req.file.path;
  } else {
    filePath = req.body.file;
  }
  const present = new Date();
  try {
    if (!userId) {
      return res.json({
        message: "user not found with this id",
      });
    }
    await mysqlPool.query(
      `UPDATE users SET profileImg=?,updated_at=? where userId=?`,
      [filePath, present, userId]
    );
    const message =
      "Profile Image Updated successfully, Please Refresh Page to see Modifications";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    console.log("done");
    res.status(200).json({
      message: "user details updated successfully",
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "error while updating user details",
    });
  }
};

const getUsersAccountStatus = async (req, res) => {
  try {
    const [usersAccountInfo] = await mysqlPool.query(
      "SELECT accountStatus,COUNT(*) AS userStatus FROM users GROUP BY (accountStatus)"
    );
    res.status(200).json({
      usersAccountInfo,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "something went wrong",
    });
  }
};
// // calender data
// const getDatesInMonth = (year, month) => {
//   let dates = [];
//   // Create a date object for the first day of the month
//   let date = new Date(year, month - 1, 1);

//   // Get the last day of the month
//   while (date.getMonth() === month - 1) {
//     dates.push(new Date(date));
//     date.setDate(date.getDate() + 1);
//   }

//   return dates;
// };

// // calendar data
// const getCalendersData = async (req, res) => {
//   try {
//     const month = req.params.month;
//     if (month > 12) {
//       return res.status(400).send('invalid month');
//     }
//     // Handle case where month start with 0
//     let year = 2024;
//     const dates = getDatesInMonth(year, month);

//     // percentage
//     const incrementMap = {
//       monday: 5,
//       tuesday: 3,
//       wednesday: 4,
//       thursday: 2,
//       friday: 6,
//       saturday: 7,
//       sunday: 5,
//     };
//     // price
//     const basePriceMap = {
//       monday: 20,
//       tuesday: 22,
//       wednesday: 25,
//       thursday: 23,
//       friday: 27,
//       saturday: 30,
//       sunday: 28,
//     };

//     const basePriceArr = Object.values(basePriceMap);
//     const incrementArr = Object.values(incrementMap);
//     const finalPrices = dates.map((date) => {
//       const cur_day = date.getDay();
//       const cur_incr = (basePriceArr[cur_day] * incrementArr[cur_day]) / 100;
//       const final_price = basePriceArr[cur_day] + cur_incr;
//       const formattedDate =
//         date.getFullYear() +
//         '-' +
//         ('0' + (date.getMonth() + 1)).slice(-2) +
//         '-' + // Month is zero-indexed, so +1
//         ('0' + date.getDate()).slice(-2);
//       const data = {
//         [formattedDate]: final_price,
//       };
//       return data;
//     });
//     console.log(finalPrices);
//     res.status(200).send(finalPrices);
//   } catch (error) {
//     res.status(500).json({
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   }
// };

// calender data
const getDatesInMonth = (year, month) => {
  let dates = [];
  // Create a date object for the first day of the month
  let date = new Date(year, month - 1, 1);
  // Get the last day of the month
  while (date.getMonth() === month - 1) {
    dates.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
};
const getCalendersData = async (req, res) => {
  try {
    const month = req.params.month;
    if (month > 12) {
      return res.status(400).send("invalid month");
    }
    // Handle case where month start with 0
    const year = new Date().getFullYear();
    const dates = getDatesInMonth(year, month);
    let nextmonthdates = 0;

    if (month + 1 == 13) {
      nextmonthdates = getDatesInMonth(+year + 1, +month - 11);
    } else {
      nextmonthdates = getDatesInMonth(year, +month + 1);
    }
    // percentage
    console.log(dates, nextmonthdates, "gjfdjgkdjkfg=>");
    const incrementMap = {
      sunday: 0,
      monday: 25,
      tuesday: 20,
      wednesday: 15,
      thursday: 10,
      friday: 5,
      saturday: 0,
    };
    // price
    const basePriceMap = {
      sunday: 0,
      monday: 60,
      tuesday: 60,
      wednesday: 60,
      thursday: 60,
      friday: 60,
      saturday: 0,
    };

    const basePriceArr = Object.values(basePriceMap);
    const incrementArr = Object.values(incrementMap);
    twoMonths = [...dates, ...nextmonthdates];
    let finalPrices = twoMonths.map((date) => {
      const cur_day = date.getDay();
      const cur_incr = (basePriceArr[cur_day] * incrementArr[cur_day]) / 100;
      const final_price = Math.floor(cur_incr);
      return final_price;
    });
    const cur_date = new Date();
    let today_date = cur_date.toISOString().split("T")[0].split("-")[2];
    today_date = parseInt(today_date) + 1;
    for (let i = 0; i < today_date; i++) {
      finalPrices[i] = 0;
    }
    console.log(finalPrices, "finalPrices");
    res.status(200).send(finalPrices);
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};
// ADMIN
//UPDATE USER STATUS BY ADMIN
const updateUserStatus = async (req, res) => {
  try {
    const { status, userId, admin } = req.body;
    const [user] = await mysqlPool.query(
      `UPDATE users SET accountStatus=? WHERE userId=?`,
      [status, userId]
    );
    const message = `Your Account has been ${status}`;
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    const message1 = `User with userID:${userId} Account has been ${status}`;
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message1, admin, 0]
    );

    res.json({
      message: "user status updated successfully",
    });
  } catch (error) {
    console.log(error, "error");
    res.json({
      error,
    });
  }
};
// export const deleteUser = async (req, res) => {};

// chart in dashboard page proof reading(user dashboard)
const chartForProofReadingData = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(userId);
    const [yearlyData] = await mysqlPool.query(
      `
        WITH months AS (
            SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month
            FROM (
                SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                UNION ALL SELECT 4 UNION ALL SELECT 5
            ) AS numbers
        )
        SELECT
            m.month,
            COALESCE(COUNT(p.created_At), 0) AS submission_count
        FROM
            months m
        LEFT JOIN
            proofReadingEditing p
            ON DATE_FORMAT(p.created_At, '%Y-%m') = m.month
            AND p.userId = ?
            AND p.created_At >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY
            m.month
        ORDER BY
            m.month
    `,
      [userId]
    );
    res.status(200).json({
      yearlyData,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: error,
    });
  }
};

// chart in dashboard page for assignment(user dashboard)
const chartForAssignmentData = async (req, res) => {
  try {
    const userId = req.params.userId;
    const [yearlyData] = await mysqlPool.query(
      `
        WITH months AS (
            SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month
            FROM (
                SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                UNION ALL SELECT 4 UNION ALL SELECT 5
            ) AS numbers
        )
        SELECT
            m.month,
            COALESCE(COUNT(p.created_At), 0) AS submission_count
        FROM
            months m
        LEFT JOIN
            orders p
            ON DATE_FORMAT(p.created_At, '%Y-%m') = m.month
            AND p.userId = ?
            AND p.created_At >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY
            m.month
        ORDER BY
            m.month
    `,
      [userId]
    );
    res.status(200).json({
      yearlyData,
    });
    console.log(yearlyData, "data");
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: error,
    });
  }
};

// chart in dashboard page proof reading(admin dashboard)
const chartForProofReadingDataAdmin = async (req, res) => {
  try {
    const [yearlyData] = await mysqlPool.query(`
        WITH months AS (
            SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month
            FROM (
                SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                UNION ALL SELECT 4 UNION ALL SELECT 5
            ) AS numbers
        )
        SELECT
            m.month,
            COALESCE(COUNT(p.created_At), 0) AS submission_count
        FROM
            months m
        LEFT JOIN
            proofReadingEditing p
            ON DATE_FORMAT(p.created_At, '%Y-%m') = m.month
            AND p.created_At >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY
            m.month
        ORDER BY
            m.month
    `);
    res.status(200).json({
      yearlyData,
    });
    console.log(yearlyData, "data");
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: error,
    });
  }
};

// chart in dashboard page for assignment(admin dashboard)
const chartForAssignmentDataAdmin = async (req, res) => {
  try {
    const [yearlyData] = await mysqlPool.query(`
        WITH months AS (
            SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month
            FROM (
                SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                UNION ALL SELECT 4 UNION ALL SELECT 5
            ) AS numbers
        )
        SELECT
            m.month,
            COALESCE(COUNT(p.created_At), 0) AS submission_count
        FROM
            months m
        LEFT JOIN
            orders p
            ON DATE_FORMAT(p.created_At, '%Y-%m') = m.month
            AND p.created_At >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY
            m.month
        ORDER BY
            m.month
    `);
    res.status(200).json({
      yearlyData,
    });
    console.log(yearlyData, "data");
  } catch (error) {
    res.status(400).json({
      message: error,
    });
  }
};

// update notification'
const updateNotification = async (req, res) => {
  try {
    const [user] = await mysqlPool.query(`SELECT * FROM users where userId=?`, [
      req.query.userId,
    ]);
    const notification = user[0].notification;
    const [updatedNotification] = await mysqlPool.query(
      "UPDATE users set notificationSeen=? where userId=?",
      [notification, req.query.userId]
    );
    res.status(200).json({
      message: "updated notification successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "error updating notification",
    });
  }
};

// forget password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [userDetails] = await mysqlPool.query(
      "select * from users where email=?",
      [email]
    );
    if (!userDetails) {
      return res.status(404).json({
        message: "user not found,Incorrect Email",
      });
    }
    const resetToken = jwt.sign(
      {
        userId: userDetails[0]?.userId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log(resetToken,resetUrl, "token");
    const mailDetails = {
      to: email,
      subject: "Reset Password",
      html: mailTemplateForResetPassword(resetUrl),
    };
    const mail = await sendMailFunction(mailDetails);
    res.status(200).json({
      message: "Password reset email sent successfully.",
    });
  } catch (error) {
    console.log(error, "error");
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// reset Password using token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    console.log(token,newPassword,"abcd")
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decode.userId;
    const [userDetails] = await mysqlPool.query(
      "select * from users where userId=?",
      [userId]
    );
    // update password
    let hashpass = await hashPassword(newPassword);
    const [updatePassword] = await mysqlPool.query(
      "update users set pass=? where userId=?",
      [hashpass, userId]
    );
    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};
module.exports = {
  getUsers,
  getUserDetailsById,
  updateUserDetailsById,
  createUser,
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
};
