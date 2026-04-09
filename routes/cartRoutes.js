const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.post('/add', cartController.addToCart); // لإضافة المنتج
router.get('/', cartController.getCart);       // لعرض الكارت
// routes/cart.js
router.post('/remove', (req, res) => {
  try {
    const { productId } = req.body;
    if (!req.session.cart) req.session.cart = [];
    let cart = req.session.cart;

    cart = cart.filter(item => item.product !== productId);
    req.session.cart = cart;

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    res.json({ success: true, totalQuantity });

  } catch(err) {
    console.error(err);
    res.json({ success: false });
  }
});

module.exports = router;