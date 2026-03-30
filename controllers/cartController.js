const Product = require("../models/Product");

exports.getCart = (req, res) => {

  const cart = req.session.cart || [];

  const subtotal = cart.reduce((total, item) => {
    return total + item.price * item.qty;
  }, 0);

  res.render("cart", {
    cart: cart,
    subtotal: subtotal
  });

};


exports.addToCart = async (req, res) => {

  const product = await Product.findById(req.params.id);

  if (!product) return res.redirect("/");

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const cart = req.session.cart;

  // نحسب السعر النهائي
  let finalPrice = product.price;

  if (product.saleType === "percentage") {
    finalPrice = product.price - (product.price * product.discountValue / 100);
  }

  if (product.saleType === "fixed") {
    finalPrice = product.price - product.discountValue;
  }

  if (product.saleType === "salePrice") {
    finalPrice = product.salePrice;
  }

  const existing = cart.find(item => item.productId == product._id);

  if (existing) {

    existing.qty += 1;

  } else {

    cart.push({
      productId: product._id,
      name: product.name,
      price: Math.round(finalPrice),
      image: product.images[0],
      qty: 1
    });

  }

res.json({
success:true,
cart:req.session.cart,
cartCount:req.session.cart.reduce((t,i)=>t+i.qty,0)
})

};


exports.removeFromCart = (req, res) => {

  const id = req.params.id;

  // لو الكارت مش موجود
  if (!req.session.cart) {
    return res.redirect("/cart");
  }

  req.session.cart = req.session.cart.filter(item => item.productId != id);

  res.redirect("/cart");

};

exports.updateQty = (req, res) => {

  const { id, qty } = req.body;

  const cart = req.session.cart;

  const item = cart.find(i => i.productId == id);

  if (item) {
    item.qty = parseInt(qty);
  }

  res.redirect("/cart");
};