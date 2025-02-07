const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mysqlPool = require('./src/db/db.js');
const userRoute = require('./src/routes/user.route.js');
const orderRoute = require('./src/routes/order.route.js');
const paymentRouter = require('./src/routes/payment.route.js');
const {fileRouter} = require('./src/routes/file.route.js');
const editorsRoute = require('./src/routes/editor.route.js');
const { verifyToken } = require('./src/controllers/copyLeaks.controller.js');
const verifyJWTToken = require('./src/middleware/verifyToken.js');
var cookieParser = require('cookie-parser');
const openAIApiRoutes = require('./src/routes/openAIApi.route.js');
const googleDriveRoutes = require('./src/routes/googleDrive.route.js');

dotenv.config();
const app = express();
const port = 8080;
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders:
      'Content-Type, Authorization, Origin, X-Requested-With, Accept',
  })
);
app.get('/home', () => {
  console.log('home running');
});

app.get('/authCheck', verifyJWTToken, (req, res) => {
  res.json({
    user:req.user,
    message: 'authenticated user',
  });
});
// routers
app.use('/api', userRoute);
app.use('/api', orderRoute);
app.use('/api/scan', fileRouter);
app.use('/api', paymentRouter);
app.use('/api', editorsRoute);
app.use('/api',openAIApiRoutes);
app.use('/api',googleDriveRoutes);


app.post('/api/hello', async (req, res) => {
  try {
    const data = req.body;
    const { scannedDocument, results } = data;
    const { scanId } = scannedDocument;
    const { score, internet } = results;
    const {
      identicalWords,
      minorChangedWords,
      relatedMeaningWords,
      aggregatedScore,
    } = score;

    const [res1] = await mysqlPool.query(
      `INSERT INTO scanScore(scanId,identicalWords,minorChangedWords,relatedMeaningWords,aggregatedScore) VALUES(?,?,?,?,?)`,
      [
        scanId,
        identicalWords,
        minorChangedWords,
        relatedMeaningWords,
        aggregatedScore,
      ]
    );

    internet.forEach(async (data) => {
      const { url, id, title, introduction } = data;
      const [res2] = await mysqlPool.query(
        `INSERT INTO scanResult(scanId,url,id,title,introduction) VALUES(?,?,?,?,?)`,
        [scanId, url, id, title, introduction]
      );
    });

    console.log({ score, internet });
  } catch (error) {
    console.log(error, 'error');
  }
});

// database and server connection
mysqlPool
  .query('SELECT 1')
  .then(() => {
    console.log('Database connection successful');
    app.listen(port, () => {
      console.log(`server listening on ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
