const Product = require("../models/Product");
const Category= require("../models/Category");
const mongoose = require("mongoose");

/* ========================= */
/* Home Page */
/* ========================= */
exports.getHome = async (req, res) => {
  try {
    // جلب كل الكاتيجوريز
    const categories = await Category.find().lean();
   const cart = req.session.cart || [];
const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    let productsByCategory = [];

    for (let cat of categories) {
      // جلب 4 منتجات مرتبطة بالكاتيجوري دي
      const products = await Product.find({ categories: cat._id })
                                    .limit(4)
                                    .lean();

      // حساب السعر النهائي لكل منتج
      products.forEach(p => {
        // لو المنتج جاي من lean() مش حيكون فيه methods، لذا نعمل نسخة مؤقتة
        p.finalPrice = (() => {
          const price = Number(p.price);
          const discount = Number(p.discountValue);
          const salePrice = Number(p.salePrice);

          if (!price || isNaN(price)) return 0;

          let finalPrice = price;

          if (p.saleType === "percentage" && discount) {
            finalPrice -= (price * discount / 100);
          } else if (p.saleType === "fixed" && discount) {
            finalPrice -= discount;
          } else if (p.saleType === "salePrice" && salePrice) {
            finalPrice = salePrice;
          }

          if (finalPrice < 0) finalPrice = 0;

          return Math.round(finalPrice);
        })();
      });

      productsByCategory.push({
        category: cat,
        products
      });
    }

    res.render("home", { productsByCategory, totalQuantity });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

/* ========================= */
/* New Arrivals */
/* ========================= */
exports.getNewArrivals = async (req, res) => {
  try {
    const products = await Product.find({ isNewArrival: true });

    products.forEach(p => {
      p.finalPrice = p.getFinalPrice();
    });

    res.render("new", { products });

  } catch (err) {
    console.log(err);
  }
};

/* ========================= */
/* Product Details */
/* ========================= */
exports.getProductDetails = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.redirect("/");

    const product = await Product.findById(id);
    if (!product) return res.redirect("/");

    product.finalPrice = product.getFinalPrice();

    res.render("product-details", { product });

  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

/* ========================= */
/* All Products */
/* ========================= */
exports.getProducts = async (req, res) => {
  const products = await Product.find();

  products.forEach(p => {
    p.finalPrice = p.getFinalPrice();
  });

  res.render("products", { products });
};

/* ========================= */
/* Collections */
/* ========================= */
exports.getCollections = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("collections", { categories });
  } catch (err) {
    console.log(err);
  }
};

/* ========================= */
/* Category Products */
/* ========================= */


exports.getCategoryProducts = async (req, res) => {
  try {
    const categoryId = req.params.category; // ده المفروض يكون ObjectId

    // تحقق إنه ObjectId صالح
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).send("Invalid category id");
    }

    // جلب المنتجات اللي تحتوي الكاتيجوري
    const products = await Product.find({ categories: categoryId });

    products.forEach(p => {
      p.finalPrice = p.getFinalPrice ? p.getFinalPrice() : p.price;
    });

    // جلب اسم الكاتيجوري
    const categoryDoc = await Category.findById(categoryId);
    const categoryName = categoryDoc ? categoryDoc.name : "Unknown";

    res.render("categoryProducts", { category: categoryName, products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

/* ========================= */
/* Sale Products */
/* ========================= */
exports.getProductSale = async (req, res) => {
  try {
    // جلب المنتجات اللي عليها خصم
    const products = await Product.find({
      $or: [
        { saleType: { $exists: true, $ne: null } },
        { discountValue: { $gt: 0 } }
      ]
    });

    products.forEach(p => {
      p.finalPrice = p.getFinalPrice();
    });

    res.render("sale", { products });

  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};