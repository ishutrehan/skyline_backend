const Router = require('express');
const express = require('express');
const {
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
  paymentDetails,
  deleteCoupon,
  getAllPromoCodes,
  addPaymentDetails,
  showAllPayments,
  monthlyFinancialReportDashboard,
  annualFinancialReportDashboard,
  createCoupon,
  validatePromotionCode,
  getAllCoupons
} = require('../controllers/payment.controller.js');
const paymentRouter = Router();

paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookForStripePayment
);
paymentRouter.post('/checkoutPayment', checkOutPaymentFunc);
paymentRouter.post(
  '/create-checkout-subscription',
  checkOutPaymentForSubscription
);
paymentRouter.post('/check-payment-status', checkPaymentStatus);
paymentRouter.get(
  '/check-subscription-plan/:userId',
  getRunningSubscriptionPlan
);
paymentRouter.post('/check-subscription-status', subscriptionStatus);
paymentRouter.put('/update-subscription-plan', updateSubscriptionPlan);
paymentRouter.delete('/cancleSubcription/:id', cancleSubcription);
paymentRouter.get('/currentPlanIncludes/:id', currentPlanIncludes);
paymentRouter.post('/updateCredits', updateCredits);
paymentRouter.post('/paymentTransaction', addPaymentDetails);
paymentRouter.get('/showAllPayments', showAllPayments);
paymentRouter.get('/monthlyFinancialReportDashboard',monthlyFinancialReportDashboard)
paymentRouter.get('/annualFinancialReportDashboard',annualFinancialReportDashboard)
paymentRouter.post('/createCoupon',createCoupon)
paymentRouter.delete('/deleteCoupon',deleteCoupon)
paymentRouter.get('/validatePromotionCode',validatePromotionCode)
paymentRouter.get('/getAllCoupons',getAllCoupons)
paymentRouter.get("/getAllPromoCodes", getAllPromoCodes);
module.exports = paymentRouter;
