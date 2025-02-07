// const { isFileLike } = require('openai/uploads.mjs');
const { unwatchFile } = require('fs');
const mysqlPool = require('../db/db.js');
const bcrypt = require('bcrypt');
const saltVal = 10;

const hashPassword = async (password) => {
  try {
    const hashedPass = await bcrypt.hash(password, saltVal);
    return hashedPass;
  } catch (error) {
    return error;
  }
};

const createEditor = async (req, res) => {
  try {
    const { name, email, pass, expertise, academic_level, interest, city } =
      req.body;
    const [duplicateEmail] = await mysqlPool.query(
      `SELECT * FROM users where email =?`,
      [email]
    );
    if (duplicateEmail.length > 0) {
      return res.json({
        message: 'duplicate email id',
      });
    }

    let hashpass = await hashPassword(pass);
    const editor = await mysqlPool.query(
      `INSERT INTO users(name,email,academic_level,interest,city,expertise,pass,accountStatus) VALUES(?,?,?,?,?,?,?,active)`,
      [name, email, academic_level, interest, city, expertise, hashpass]
    );
    res.status(201).json({
      message: 'editor registered successfully',
    });
  } catch (error) {
    console.log(error);
    res.status(error.status || 404).json({
      error: error.message || 'Error creating',
    });
  }
};

// show all the ediotrs
const getEditors = async (req, res) => {
  try {
    const pageNo = req.query.pageNo || 1;
    const dataPerPage = 8;
    const currentPageData = (pageNo - 1) * dataPerPage;
    const [totalEditors] = await mysqlPool.query(
      `SELECT * FROM users where accountType='editor'`
    );

    const [editors] = await mysqlPool.query(
      `SELECT * FROM users where accountType='editor' ORDER BY created_At DESC LIMIT ? OFFSET ?`,
      [dataPerPage, currentPageData]
    );

    const totalPages = Math.ceil(totalEditors.length / dataPerPage);
    res.status(200).json({
      totalPages,
      editors,
    });
  } catch (error) {
    console.log(error);
    res.status(error.status || 404).json({
      error: error.message || 'Error creating',
    });
  }
};

const UpdateEditors = async (req, res) => {
  const {
    userId,
    name,
    email,
    expertise,
    city,
    interest,
    academic_level,
    accountStatus,
    admin,
  } = req.body;
  try {
    const Editors = await mysqlPool.query(
      `SELECT * FROM users where userId = ?`,
      [userId]
    );
     const uniqueEmail = await mysqlPool.query(
       `SELECT * FROM users where email = ?`,
       [email]
     );
     console.log( uniqueEmail.length,Editors[0][0].email,email,'kfjdgfdkglj')
     console.log(uniqueEmail[0]==[],'now check')
    if (Editors && (uniqueEmail[0].length==0 || Editors[0][0].email == email)) {
      await mysqlPool.query(
        `UPDATE users SET email = ?, name = ?, expertise = ?,city=?,interest=?,academic_level=?,accountStatus=? WHERE userId = ?`,
        [email, name, expertise, city, interest, academic_level,accountStatus, userId]
      );
      res.status(200).json({ message: "updates successfully" });
      const message = "Your Account has been Updated By Administrator";
      await mysqlPool.query(
        "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
        [message, userId, 0]
      );
      const message1 = "Editor has been Updated Successfully";
      await mysqlPool.query(
        "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
        [message1, admin, 0]
      );
    }
    else{
      res.status(400).json({message : 'Email must be unique'})
    }
  } catch (err) {
    res.status(404).json({ message: err });
    console.log(err);
  }
};

module.exports = {
  getEditors,
  createEditor,
  UpdateEditors,
};
