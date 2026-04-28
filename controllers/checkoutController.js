const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Shipping = require('../models/Shipping');

// GET Checkout Page
// GET Checkout Page
exports.getCheckout = async (req, res) => {
  try {
    const { productId, size, color, price, qty } = req.query;
    const quantity = parseInt(qty) || 1;

    let cartItems = [];

    // ✅ حالة Buy Now
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).send("Invalid product ID");
      }

      const product = await Product.findById(productId);
      if (!product) return res.status(404).send("Product not found");

      cartItems.push({
        ...product._doc,
        quantity,
        selectedSize: size || null,
        selectedColor: color || null,
        selectedPrice: price || product.salePrice || product.price
      });
    } 
    // ✅ حالة Cart من السيشن
    else {
      const cart = req.session.cart || [];

      if (cart.length === 0) {
        return res.redirect('/cart');
      }

      // جلب كل الـ productIds
      const productIds = cart.map(item => item.product);

      // جلب المنتجات من DB
      const products = await Product.find({ _id: { $in: productIds } });

      // دمج البيانات مع السيشن
cartItems = [];

for (let p of products) {
  const matchedItems = cart.filter(c => c.product === p._id.toString());

  for (let item of matchedItems) {
    cartItems.push({
      ...p._doc,
      quantity: item.quantity,
      selectedSize: item.size,
      selectedColor: item.color,
      selectedPrice: p.salePrice || p.price
    });
  }
}
    }

    // حساب subtotal
    const subtotal = cartItems.reduce((sum, item) => sum + (item.selectedPrice * item.quantity), 0);

    let shipping = 0;
    let message = '';

    if (subtotal < 1499) {
      shipping = 0;
    } else {
      message = "🎉 Free shipping applied!";
    }

    res.render('checkout', {
      cartItems,
      subtotal,
      shipping,
      total: subtotal + shipping,
      message
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};// POST Place Order
exports.placeOrder = async (req, res) => {
  try {
const {
  products,
  governorate,
  customerName,
  customerEmail,
  customerNumber,
  customerAddress,
  couponCode,
  shipping,
  discount,
  total
} = req.body;

    const isGmail = (email) => email?.endsWith("@gmail.com");

    if (!isGmail(customerEmail)) {
      return res.status(400).json({ error: "Email must be Gmail" });
    }

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "No products in order" });
    }

    // ====== CHECK STOCK FIRST ======
    for (let item of products) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) continue;

      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${product.name}`
        });
      }
    }

    // ====== CREATE ORDER ======
    const order = new Order({
      products,
      governorate,
      customerName,
      customerEmail,
      customerNumber,
      customerAddress,
      shipping: Number(shipping) || 0,
      discount: Number(discount) || 0,
      totalPrice: Number(total),
      finalPrice: Number(total),
      couponCode: couponCode || null,
      status: "pending"
    });

    await order.save();

    // ====== DECREASE STOCK SAFELY ======
    for (let item of products) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) continue;

      await Product.updateOne(
        {
          _id: item.product,
          stock: { $gte: item.quantity } // حماية إضافية
        },
        {
          $inc: { stock: -item.quantity }
        }
      );
    }

    // ====== COUPON USAGE ======
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

      if (coupon) {
        await Coupon.updateOne(
          { _id: coupon._id },
          { $inc: { usedCount: 1 } }
        );
      }
    }

    // ====== EMAIL ======
    const { sendOrderEmail, sendAdminOrderEmail } = require("../utils/mailer");
const ADMIN_EMAIL = "Veekegy@gmail.com";
await sendOrderEmail(customerEmail, customerName);

await sendAdminOrderEmail(ADMIN_EMAIL, order);

    

    // ====== CLEAR CART ======
    req.session.cart = [];

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET Calculate Shipping & Coupon
exports.calculate = async (req, res) => {
  try {
    const { subtotal, code, governorate } = req.query;

    if (subtotal == null || !governorate) {
      return res.json({ success: false });
    }

    const subNum = parseFloat(subtotal);
    let shippingPrice = 0;

    if (subNum < 1499) {
      const ship = await Shipping.findOne({ governorate });
      shippingPrice = ship ? ship.price : 50;
    }

    let discount = 0;
    let message = '';

    if (code) {
      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true
      });

      if (coupon) {
        discount = coupon.discountType === "percentage"
          ? subNum * (coupon.discountValue / 100)
          : coupon.discountValue;
        message = `Coupon applied! You saved ${discount} EGP`;
      } else {
        message = "Invalid coupon";
      }
    }

    const total = subNum + shippingPrice - discount;

    res.json({
      success: true,
      discount,
      shipping: shippingPrice,
      total,
      message
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};
