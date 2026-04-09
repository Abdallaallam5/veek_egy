const Product = require('../models/Product');

exports.addToCart = async (req, res) => {
  try {
const { productId, size, color } = req.body;

if (!productId || !/^[0-9a-fA-F]{24}$/.test(productId)) {
  return res.json({ success: false, error: "Invalid product id" });
}

    if (!req.session.cart) req.session.cart = [];

    const cart = req.session.cart;

    const existing = cart.find(item =>
      item.product === productId &&
      item.size === size &&
      item.color === color
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        product: productId,
        quantity: 1,
        size,
        color
      });
    }

    // احسب العدد الكلي للكارت
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ success: true, totalQuantity });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

exports.getCart = async (req, res) => {
  try {
    const cart = req.session.cart || [];

    // ✅ فلتر أي productId مش ObjectId صالح
    const validProductIds = cart
      .map(item => item.product)
      .filter(id => id && /^[0-9a-fA-F]{24}$/.test(id));

    const products = await Product.find({ _id: { $in: validProductIds } });

    const cartItems = cart.map(item => {
      const product = products.find(p => p._id.toString() === item.product);
      if (!product) return null; // تجاهل أي منتجات غير موجودة
      return {
        ...product._doc,
        quantity: item.quantity,
        selectedSize: item.size,
        selectedColor: item.color,
        selectedPrice: product.salePrice || product.price
      };
    }).filter(i => i !== null);

    res.render('cart', { cartItems });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading cart");
  }
};
