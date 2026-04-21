const Product = require('../models/Product');

exports.addToCart = async (req, res) => {
  try {
    const { productId, size, color, qty } = req.body;

    if (!productId || !/^[0-9a-fA-F]{24}$/.test(productId)) {
      return res.json({ success: false, error: "Invalid product id" });
    }

    const quantityToAdd = parseInt(qty) || 1;

    if (!req.session.cart) req.session.cart = [];
    const cart = req.session.cart;

    // ✅ إجمالي الكارت
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (totalQuantity + quantityToAdd > 10) {
      return res.json({
        success: false,
        error: "Cart limit is 10 items"
      });
    }

    // ✅ شوف المنتج موجود بنفس الـ variation ولا لأ
    const existing = cart.find(item =>
      item.product === productId &&
      item.size === size &&
      item.color === color
    );

    if (existing) {
      if (existing.quantity + quantityToAdd > 10) {
        return res.json({
          success: false,
          error: "Max 10 per product"
        });
      }

      existing.quantity += quantityToAdd;
    } else {
      cart.push({
        product: productId,
        quantity: quantityToAdd,
        size,
        color
      });
    }

    const newTotal = cart.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ success: true, totalQuantity: newTotal });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};exports.getCart = async (req, res) => {
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
