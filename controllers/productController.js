  const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const connectDB = require("../config/db");

/* ========================= */
/* Home Page */
/* ========================= */
exports.getHome = async (req, res) => {
  try {
    await connectDB();

    const categories = await Category.find()
      .sort({ createdAt: -1 })
      .lean();

    const cart = req.session.cart || [];
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    const productsByCategory = await Promise.all(
      categories.map(async (cat) => {

        const products = await Product.find({ categories: cat._id })
          .limit(10)
          .lean();

        const formattedProducts = products.map((p) => {
          const price = Number(p.price) || 0;
          const discount = Number(p.discountValue) || 0;
          const salePrice = Number(p.salePrice) || 0;

          let finalPrice = price;

          if (p.saleType === "percentage" && discount) {
            finalPrice -= (price * discount / 100);
          } 
          else if (p.saleType === "fixed" && discount) {
            finalPrice -= discount;
          } 
          else if (p.saleType === "salePrice" && salePrice) {
            finalPrice = salePrice;
          }

          if (finalPrice < 0) finalPrice = 0;

          return {
            ...p,
            finalPrice: Math.round(finalPrice)
          };
        });

        return {
          category: cat,
          products: formattedProducts
        };
      })
    );

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
    await connectDB();

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
    await connectDB();

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
  await connectDB();

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
    await connectDB();

    const categories = await Category.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render("collections", { categories });

  } catch (err) {
    console.error("Collections Error:", err);
    res.status(500).send("Server Error");
  }
};

/* ========================= */
/* Category Products */
/* ========================= */
exports.getCategoryProducts = async (req, res) => {
  try {
    await connectDB();

    const categoryId = req.params.category;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).send("Invalid category id");
    }

    const products = await Product.find({ categories: categoryId });

    products.forEach(p => {
      p.finalPrice = p.getFinalPrice ? p.getFinalPrice() : p.price;
    });

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
    await connectDB();

    const products = await Product.find({
      $or: [
        { saleType: { $exists: true, $ne: null } },
        { discountValue: { $gt: 0 } }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedProducts = products.map((p) => {
      const price = Number(p.price) || 0;
      const discount = Number(p.discountValue) || 0;
      const salePrice = Number(p.salePrice) || 0;

      let finalPrice = price;

      if (p.saleType === "percentage" && discount) {
        finalPrice -= (price * discount / 100);
      } 
      else if (p.saleType === "fixed" && discount) {
        finalPrice -= discount;
      } 
      else if (p.saleType === "salePrice" && salePrice) {
        finalPrice = salePrice;
      }

      if (finalPrice < 0) finalPrice = 0;

      return {
        ...p,
        finalPrice: Math.round(finalPrice)
      };
    });

    res.render("sale", { products: formattedProducts });

  } catch (err) {
    console.error("Sale Page Error:", err);
    res.status(500).redirect("/");
  }
};
