const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");
const Order = require('../models/Order');
const Product =require('../models/Product')

const orderCtrl = require("../controllers/cartController");

router.get("/", productCtrl.getHome);
router.get("/all", productCtrl.getProducts);

router.get("/new", productCtrl.getNewArrivals);
router.get("/collections", productCtrl.getCollections);
router.get("/collections/:category", productCtrl.getCategoryProducts);
router.get("/product/:id", productCtrl.getProductDetails);
router.get("/product/sale", productCtrl.getProductSale);
router.get("/sale", async (req, res) => {
  try {
    const products = await Product.find({
      salePrice: { $exists: true }
    });

    // فلترة في السيرفر
    const saleProducts = products.filter(p => p.salePrice < p.price);

    res.render("sale", { products: saleProducts });

  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading sale page");
  }
});
// routes/orderRoutes.js


// router.get("/checkout", orderCtrl.getCheckout);
// router.get("/sale", productCtrl.getSale);
// router.get("/contact", productCtrl.getContact);
// router.get("/faq", productCtrl.getFaq);
module.exports = router;