const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();
console.log(process.env.HOST,'hhh==>')
const mysqlPool = mysql.createPool({
 host: '62.72.50.204',
  user:  'u778642913_root',
  password: 'rM8-Lun3k',
  database:  'u778642913_skylineBackend',
});

module.exports = mysqlPool;
