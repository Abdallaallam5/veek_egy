const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.get('/get', checkoutController.getCheckout);
router.post('/place-order', checkoutController.placeOrder);
router.get('/calculate', checkoutController.calculate);

module.exports = router;