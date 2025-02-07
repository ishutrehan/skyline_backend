const jwt = require('jsonwebtoken');
const mysqlPool = require('../db/db');
async function verifyJWTToken(req, res, next) {
  const token = req.cookie;
  console.log(token,"token")
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const decode = jwt.verify(token, process.env.JWT_SECRET);
  if (!decode) {
    return res.status(401).json({ message: 'unauthorized access' });
  }
  const [user] = await mysqlPool.query(`SELECT userId,name,email,academic_level,interest,city,accountStatus,accountType FROM users WHERE userId=?`,[decode.userId])
  if (!user) {
    return res.status(401).json({ message: 'user not found' });
  }
  req.user = user;
  next();
}

module.exports = verifyJWTToken;
