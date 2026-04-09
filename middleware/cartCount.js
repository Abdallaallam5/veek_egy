module.exports = (req, res, next) => {
  const cart = req.session.cart || [];
  res.locals.cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  next();
};
