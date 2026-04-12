const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.get('/get', checkoutController.getCheckout);
router.post('/place-order', checkoutController.placeOrder);
router.get('/calculate', checkoutController.calculate);
router.post("/checkout/send-otp", checkoutController.sendOtp);
router.post("/checkout/verify-otp", checkoutController.verifyOtp);

module.exports = router;
