const jwt = require('jsonwebtoken');

async function createToken(userId, res) {
  const token = jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.cookie('jwt', token, {
    maxAge: 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
  });
}

module.exports = createToken;
