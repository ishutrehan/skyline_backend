const { config } = require("dotenv");
const db = require("../db/db");
const { createOrder } = require("./order.controller");
const mysqlPool = require("../db/db");
const moment = require("moment");
const { truncate } = require("fs");
const sendMailFunction = require("../utils/nodemailer");

const stripe = require("stripe")(process.env.STRIPEKEY);

const [basic, premium, advance] = [5, 10, 15];
// payment for copy detection,for writter etc for a one time payment
const checkOutPaymentFunc = async (req, res) => {
  try {
    // orderType contains the order for which payment has been received(ai detection,plagairism detection etc...)
    const { pay, token, email } = req.body;
    if(token !== 'null'){

      const paymentMethod = await stripe.paymentMethods.create({
        type: "card",
        card: {
        token: token,
      },
    });
    const amountInCents = Math.round(pay * 100);
    const payment = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method: paymentMethod.id,
      confirm: true,
      return_url: "https://emily.support/",
    });
    
    mailTransfer(email); 
    res.json({
      payment,
    });
  }
    else{
      mailTransfer(email);
    }
   
  } catch (error) {
    console.log(error, "error");
    res.json({
      message: error.message || "something went wrong",
    });
  }
};

const mailTransfer = async (email) => {
  try {
    
    const mailDetails = {
      from: "support@skylineacademic.com",
      to: email,
      subject: "Payment Confirmation",
      html: newMailTemplate(),
    };
    const mail = await sendMailFunction(mailDetails);
    return;
  } catch (error) {
    return error
};
}
function newMailTemplate() {
 
  return `
  <!DOCTYPE html>
<html>
<head>
  <title>Payment Successful</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    h2 {
      color: #2d89ff;
    }
    p {
      color: #555;
      font-size: 16px;
      line-height: 1.6;
    }
    .success-icon {
      font-size: 50px;
      color: #28a745;
      margin-bottom: 15px;
    }
    .footer {
      margin-top: 20px;
      font-size: 14px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✔</div>
    <h2>Payment Successful!</h2>
    <p>Thank you for your payment. Your transaction has been processed successfully.</p>
    <p>If you have any questions, feel free to contact our support team.</p>
    <div class="footer">
      <p>Best regards, <br> Skyline Academic</p>
    </div>
  </div>
</body>
</html>
  `
}


// for subscription
const stripeCheckoutSession = async (planId, customerId) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [
        {
          price: planId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      // success_url: `${YOUR_DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      // cancel_url: `${YOUR_DOMAIN}/cancel.html`,
      success_url: `http://localhost:4200/success`,
      cancel_url: `http://frontend.skylineacademic.com/fail`,
      // success_url: `http://frontend.skylineacademic.com/user/success`,
      // cancel_url: `http://frontend.skylineacademic.com/user/fail`,nnn
    });
    return session;
  } catch (error) {
    console.log(error);
    return error;
  }
};

// check here subscription is availble or not ,if not then create a subscription else return customer id
const getOrCreateCustomer = async (email, userId) => {
  try {
    const [subscriptionPlan] = await mysqlPool.query(
      "SELECT * FROM subscriptions WHERE userId=?",
      [userId]
    );
    if (!subscriptionPlan.length) {
      const customer = await stripe.customers.create({ email });
      await mysqlPool.query(
        "INSERT INTO subscriptions (userId,email,customer) VALUES (?,?,?)",
        [userId, email, customer.id]
      );
      const message = "Subscription successfull !";
      await mysqlPool.query(
        "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
        [message, userId, 0]
      );
      return customer.id;
    }
    return subscriptionPlan.customer;
  } catch (error) {
    return error;
  }
};

const checkOutPaymentForSubscription = async (req, res) => {
  try {
    // planDescription Basic,premium and advanced
    const { amount, planDescription, email, userId } = req.body;
    // product list from stripe
    const products = await stripe.products.list({
      limit: 3,
    });
    // planId on the basis of plan subscribed
    const planDetails = products.data.find(
      (data) => data.description === planDescription
    );
    const planId = planDetails.default_price;
    const customerId = await getOrCreateCustomer(email, userId);
    const checkoutSession = await stripeCheckoutSession(planId, customerId);
    const message = "Payment done successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    res.json({
      checkoutSession,
      value: true,
    });
  } catch (error) {
    res.json({
      message: "Something went wrong",
      value: false,
    });
  }
};

// create subscription data in database ;
const checkPaymentStatus = async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subscriptionDetails = await stripe.subscriptions.retrieve(
      session.subscription
    );
    // console.log(subscriptionDetails, 'subsdetails');
    const { id, customer, current_period_end, current_period_start, plan } =
      subscriptionDetails;
    const duration = 30;
    const amount = plan.amount / 100;
    const planId = plan.id;
    const planType =
      plan.amount === 5 ? "Basic" : plan.amount === 10 ? "Premium" : "Advance";
    const startDate = moment.unix(current_period_start).format("YYYY-MM-DD");
    const endDate = moment.unix(current_period_end).format("YYYY-MM-DD");
    console.log(
      id,
      duration,
      amount,
      planId,
      planType,
      startDate,
      endDate,
      userId
    );
    const updateSubscriptionPlan = await mysqlPool.query(
      "UPDATE subscriptions SET stripeSubscriptionId=?, duration=?, amount=?, planId=?, planType=?, startDate=?, endDate=?,status=?,credit=? WHERE userId=?",
      [
        id,
        duration,
        amount,
        planId,
        planType,
        startDate,
        endDate,
        "Active",
        100,
        userId,
      ]
    );
    const message = "Subscription updated successfully successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    res.json({
      subscriptionDetails,
    });
  } catch (error) {
    res.json({
      message: "something went wrong",
    });
  }
};

// get subscription plan taken by a user
const getRunningSubscriptionPlan = async (req, res) => {
  try {
    const userId = req.params.userId;
    // await subscriptionStatus(userId);
    const [res1] = await mysqlPool.query(
      `SELECT * FROM subscriptions WHERE userId=${userId} AND status='Active'`
    );
    if (!res1.length) {
      return res.json({ message: "No Subscriptions" });
    }
    const [{ amount, planType, credit, startDate, endDate }] = res1;
    res.json({ amount, planType, credit, startDate, endDate });
  } catch (error) {
    console.log(error);
    res.json({
      message: error,
    });
  }
};

// update plan status with check
const subscriptionStatus = async (userId) => {
  try {
    const [res] = await mysqlPool.query(
      `SELECT * FROM subscriptions where userId='${userId}'`
    );
    if (res.length > 0) {
      const subId = res[res.length - 1].subscriptionId;
      console.log(subId, "subId");
      const today = new Date();
      const databaseDateTimeString = res[res.length - 1].endDate;
      const databaseDate = new Date(databaseDateTimeString);
      if (
        today.getMonth() >= databaseDate.getMonth() &&
        today.getDate() >= databaseDate.getDate()
      ) {
        const update = await mysqlPool.query(
          `UPDATE subscriptions SET status='Deactivate' where subscriptionId=${subId}`
        );
      }
    }
    return;
  } catch (error) {
    console.log(error);
  }
};

const updateSubscriptionPlan = async (req, res) => {
  try {
    const { userId, planDescription, amount } = req.body;
    const planType =
      amount === 5 ? "Basic" : amount === 10 ? "Premium" : "Advance";
    const dateIs = new Date();
    // console.log({userId,planDescription,amount},"abcdValue")
    const [result] = await mysqlPool.query(
      "SELECT * FROM subscriptions where userId = ?",
      [userId]
    );
    // console.log(result[0].stripeSubscriptionId,"result is")
    const subscription = await stripe.subscriptions.retrieve(
      // req.body.subscriptionId
      result[0].stripeSubscriptionId
    );

    // console.log(subscription,"subscription")
    // list of products
    const products = await stripe.products.list({
      limit: 3,
    });
    // console.log(products,"product")
    // planId on the basis of plan subscribed
    const planDetails = products.data.find(
      (data) => data.description === planDescription
    );
    const planId = planDetails.default_price;
    // console.log(planId,"planId")
    const updatedSubscription = await stripe.subscriptions.update(
      // req.body.subscriptionId
      result[0].stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            // price: process.env[req.body.newPriceLookupKey.toUpperCase()],
            price: planId,
          },
        ],
      }
    );

    const updateSubscriptionPlan = await mysqlPool.query(
      "UPDATE subscriptions SET amount=?,planId=?,planType=?,startDate=? where stripeSubscriptionId=?",
      [amount, planId, planType, dateIs, result[0].stripeSubscriptionId]
    );
    const message = "Subscription updated successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    // console.log(updatedSubscription,"updatedSubscription")
    res.status(200).json({
      message: "Subscription updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: error,
    });
  }
};

// webhooks for stripe recurring payment and so on...
const webhookForStripePayment = async (req, res) => {
  const endpointSecret =
    "whsec_06986bafe1c9754dd741db0d1cac7338f259743542fcf83bedd78a180f9de4ba";
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "invoice.paid":
      const invoice = event.data.object;
      handleSuccessfulPayment(invoice);
      break;
    case "customer.subscription.deleted":
      const customerSubscriptionDeleted = event.data.object;
      handleDeleteSubscriptionPlan(customerSubscriptionDeleted);
    case "customer.subscription.updated":
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Acknowledge receipt of the event
  res.json({ received: true });
};

// Function to handle successful payments(montly payment)
const handleSuccessfulPayment = async (invoice) => {
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;
  const updateSubscriptionPlan = await mysqlPool.query(
    "UPDATE subscriptions SET credit=? where stripeSubscriptionId=?",
    [100, subscriptionId]
  );
  // Update your database with the payment information
  console.log(
    `Payment succeeded for subscription ${subscriptionId} and customer ${customerId}`
  );

  // Here you can update your database to reflect the successful payment
  // e.g., mark the subscription as active, update the next payment date, etc.
};

// Function to handle cancle payments
const handleDeleteSubscriptionPlan = (data) => {
  console.log(data, "data");
};
// cancle subscription
const cancleSubcription = async (req, res) => {
  try {
    const userId = req.params.id;
    const [dataVal] = await mysqlPool.query(
      "SELECT * FROM subscriptions WHERE userId=?",
      [userId]
    );
    console.log(dataVal, "data");
    const subscription = await stripe.subscriptions.cancel(
      // 'sub_1PJ9fpSBTKx24TLsNJTenjEk'
      dataVal[0].stripeSubscriptionId
    );
    await mysqlPool.query("UPDATE subscriptions SET status=? WHERE userId=?", [
      "Deactivate",
      userId,
    ]);
    const message = "Subscription Deleted successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    res.status(200).json({
      message: "subscription deleted successfully",
    });
  } catch (error) {
    console.log(error, "error");
    res.status(500).json({
      message: "error deleting subscription",
    });
  }
};

// current plan includes(features access like detection etc)
const currentPlanIncludes = async (req, res) => {
  try {
    const userId = req.params.id;
    const [planIncludes] = await mysqlPool.query(
      "SELECT s.userId ,cp.* FROM subscriptions AS s JOIN currentSubscriptionPlan AS cp ON s.planType = cp.planType WHERE s.userId=?",
      [userId]
    );
    res.status(200).json({
      planIncludes,
    });
  } catch (error) {
    res.status(500).json({
      message: error,
    });
  }
};

// update credits on the basis of current uses
const updateCredits = async (req, res) => {
  try {
    const { noOfWords, userId } = req.body;
    const creditDeduction = Math.ceil(noOfWords / 250);
    const [subscriptionDetails] = await mysqlPool.query(
      "SELECT * FROM subscriptions WHERE userId=?",
      [userId]
    );
    console.log(subscriptionDetails, "subs");
    const remainingCredits = subscriptionDetails[0].credit - creditDeduction;
    if (remainingCredits < 0) {
      return res.json({
        message: "Not enough credits",
      });
    }
    const [creditsRemaining] = await mysqlPool.query(
      "update subscriptions set credit=? where userId=?",
      [remainingCredits, userId]
    );
    const message = "Payment Successfully Done";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    res.status(200).json({
      message: "Updated Successfully",
    });
  } catch (error) {
    const message = "Payment Failed ";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    console.log(error, "error");
    res.status(200).json({
      message: error,
    });
  }
};

// add orders payment details in db
const addPaymentDetails = async (req, res) => {
  try {
    const { userId, userName, email, workType, amountPaid, creditPaid } =
      req.body;
    const [data] = await mysqlPool.query(
      `INSERT INTO payment(userId,username,email,workType,amountPaid,creditPaid) VALUES(?,?,?,?,?,?)`,
      [userId, userName, email, workType, amountPaid, creditPaid]
    );
    res.status(200).json({
      message: "payment added successfully",
    });
  } catch (error) {
    console.log(error, "err");
    res.status(500).json({
      message: error,
    });
  }
};

// show all the payments in admin dashboard
const showAllPayments = async (req, res) => {
  try {
    const pageNo = req.query.pageNo || 1;
    const dataPerPage = 8;
    const currentPageData = (pageNo - 1) * dataPerPage;
    const [totalData] = await mysqlPool.query(`SELECT * FROM payment`);
    const [data] = await mysqlPool.query(
      `SELECT * FROM payment ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [dataPerPage, currentPageData]
    );

    const totalPages = Math.ceil(totalData.length / dataPerPage);
    res.status(200).json({
      totalPages,
      data,
    });
  } catch (error) {
    res.status(500).json({
      message: error,
    });
  }
};

// financial report dashbord in admin side
const monthlyFinancialReportDashboard = async (req, res) => {
  try {
    const [monthlyFinancialReport] = await mysqlPool.query(`WITH months AS (
    SELECT DATE_FORMAT(DATE_ADD(LAST_DAY(DATE_SUB(CURDATE(), INTERVAL n MONTH)), INTERVAL 1 DAY), '%Y-%m') AS month
    FROM (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
        UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
    ) AS numbers
)
SELECT
    m.month,
    COALESCE(ROUND(SUM(p.amountPaid), 2), 0) AS monthly_revenue
FROM
    months m
LEFT JOIN
    payment p
    ON DATE_FORMAT(p.created_at, '%Y-%m') = m.month
    AND YEAR(p.created_at) = YEAR(CURDATE())
GROUP BY
    m.month
ORDER BY
    m.month ASC
`);

    res.status(200).json({
      monthlyFinancialReport,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
    });
  }
};

const annualFinancialReportDashboard = async (req, res) => {
  try {
    const [annualFinancialReport] = await mysqlPool.query(`WITH years AS (
    SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n YEAR), '%Y') AS year
    FROM (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    ) AS numbers
)
SELECT
    y.year,
    COALESCE(ROUND(SUM(p.amountPaid), 2), 0) AS yearly_revenue
FROM
    years y
LEFT JOIN
    payment p
    ON DATE_FORMAT(p.created_at, '%Y') = y.year
    AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)
GROUP BY
    y.year
ORDER BY
    y.year ASC
`);
    res.status(200).json({
      annualFinancialReport,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
    });
  }
};

// annual revenue
// monthly revenue

// coupon system
const createCoupon = async (req, res) => {
  try {
    // const stripe = require("stripe")(
    // );

    const { id, percentageOff, promotioncode, expireDate } = req.body;
    console.log(
      id,
      percentageOff,
      promotioncode,
      expireDate,
      "id, percentageOff, promotioncode, expireDate"
    );
    // Specify your expiration date (last date for redemption)
    const redeemByDate = Math.floor(new Date(expireDate).getTime() / 1000); // Convert to Unix timestamp
    // try {
    //   const duplicateCoupon = await stripe.coupons.retrieve(id);

    // } catch (error) {
    //   if(error.rawType == 'invalid_request_error'){
    //     return res.status(400).json({
    //       message: "Duplicate Coupon Code",
    //     })
    //   }
    // }

    // id is as name
    // create a coupon
    const coupon = await stripe.coupons.create({
      id: id, //'christmas',
      duration: "once",
      percent_off: percentageOff, //5
      redeem_by: redeemByDate, //expire date
    });

    // generate coupon code
    const promotionCode = await stripe.promotionCodes.create({
      coupon: id, //'christmas',
      code: promotioncode, //'CHRISTMAS',
      // max_redemptions: 5,
    });

    res.status(201).json({
      coupon,
      promotionCode,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "coupon creation failed",
    });
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const coupons = await stripe.coupons.list({
    });
    console.log(coupons, "cou");
    res.status(200).json({
      coupons,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: "coupons not found",
    });
  }
};

const getAllPromoCodes = async (req, res) => {
  try {
    const promotionCodes = await stripe.promotionCodes.list({});
    // const findVal = promotionCodes.data.find(
    //   (obj) => obj.coupon.id === "christmas"
    // );
    // console.log(findVal.id);
    res.status(200).json({
      promotionCodes,
    });
  } catch (error) {
    res.status(404).json({
      message: "promotion code not found or something wrong",
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { couponCode } = req.query;
    const deleted = await stripe.coupons.del(couponCode);
    const promotionCodes = await stripe.promotionCodes.list({});
    const findVal = promotionCodes.data.find(
      (obj) => obj.coupon.id === couponCode
    );

    // deactivate promotion code also along with couponCode deleted
    const promotionCode = await stripe.promotionCodes.update(findVal.id, {
      active: false,
    });
    res.status(200).json({
      message: "coupon deleted successfully",
    });
    // console.log(deleted, promotionCode);
  } catch (error) {
    res.status(500).json({
      message: "something went wrong",
    });
  }
};

const validatePromotionCode = async (req, res) => {
  try {
    const { promotionCode } = req.query;
    const promoCode = await stripe.promotionCodes.list({ code: promotionCode });
    if (promoCode.data.length === 0) {
      return res.send("Invalid Promotion code,Add Correct Promo Code");
    }
    res.status(200).json({
      message: "Promo code applied successfully",
    });
  } catch (error) {
    res.status(404).json({
      message: "Promotion code not found",
    });
  }
};
module.exports = {
  checkOutPaymentFunc,
  checkOutPaymentForSubscription,
  checkPaymentStatus,
  getRunningSubscriptionPlan,
  subscriptionStatus,
  updateSubscriptionPlan,
  webhookForStripePayment,
  cancleSubcription,
  currentPlanIncludes,
  updateCredits,
  addPaymentDetails,
  showAllPayments,
  monthlyFinancialReportDashboard,
  annualFinancialReportDashboard,
  createCoupon,
  getAllCoupons,
  getAllPromoCodes,
  deleteCoupon,
  validatePromotionCode,
};
