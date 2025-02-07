const mysql = require('mysql2/promise');
const mysqlPool = mysql.createPool({
  host: '62.72.50.204',
  user: 'u778642913_skyline',
  password: 'zY=9rkFb',
  database: 'u778642913_skyline',
});

module.exports = mysqlPool;
