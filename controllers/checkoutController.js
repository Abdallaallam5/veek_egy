const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Shipping = require('../models/Shipping');

// GET Checkout Page
exports.getCheckout = async (req, res) => {
  try {
    const productId = req.query.productId;
    const size = req.query.size;
    const color = req.query.color;
    const price = req.query.price;
    const qty = parseInt(req.query.qty) || 1;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Product not found');

    const subtotal = product.salePrice * qty;
    const shipping = 50; // default

    res.render("checkout", { product, size, color, qty, price, subtotal, shipping, total: subtotal + shipping });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// POST Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { products, governorate, customerName, customerEmail, customerAddress, couponCode, shipping, discount, total } = req.body;

    if (!products || products.length === 0)
      return res.status(400).json({ error: 'No products in order' });

    // تحقق من المنتجات والمخزون
    for (let item of products) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (item.quantity > product.stock) return res.status(400).json({ error: `Not enough stock for ${product.name}` });
    }

    // إنشاء الأوردر
    const order = new Order({
      products,
      governorate,
      customerName,
      customerEmail,
      customerAddress,
      shipping: shipping ,
      discount,
      totalPrice: total,
      finalPrice: total,
      couponCode: couponCode || null,
      status: "pending"
    });

    await order.save();

    // تحديث المخزون
    for (let item of products)
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -parseInt(item.quantity) } });

    // زيادة استخدام الكوبون
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon) await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};