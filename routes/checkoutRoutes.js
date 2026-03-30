const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Shipping = require('../models/Shipping');
const checkoutController = require('../controllers/checkoutController');

router.get('/get', checkoutController.getCheckout);
router.post('/place-order', checkoutController.placeOrder);

// حساب الشحن + الخصم + المجموع
router.get('/calculate', async (req, res) => {
  try {
    const { subtotal, code, governorate } = req.query;

    if (!subtotal || !governorate)
      return res.json({ success: false, message: "Missing subtotal or governorate" });

    const subNum = parseFloat(subtotal);

    // سعر الشحن
    const ship = await Shipping.findOne({ governorate });
    const shippingPrice = ship ? ship.price : 50;

    
    let discount = 0;
    let message = '';
    if (code) {
      const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
      if (coupon) {
        discount = coupon.discountType === "percentage"
          ? subNum * (coupon.discountValue / 100)
          : coupon.discountValue;
        message = `Coupon applied! You saved ${discount} EGP`;
      } else message = "Invalid or expired coupon";
    }

    const total = subNum + shippingPrice - discount;

    res.json({ success: true, discount, shipping: shippingPrice, total, message, couponCode: code || null   });
  } catch (err) {
    console.error(err);
    res.json({ success: false, discount:0, shipping:0, total:0, message:'Error calculating' });
  }
});

module.exports = router;