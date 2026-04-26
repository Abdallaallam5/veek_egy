const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");
const Order = require('../models/Order');
const Product =require('../models/Product')

const orderCtrl = require("../controllers/cartController");
const { render } = require("ejs");

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
    }.sort({ createdAt: -1 }));

    // فلترة في السيرفر
    const saleProducts = products.filter(p => p.salePrice < p.price);

    res.render("sale", { products: saleProducts });

  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading sale page");
  }
});
router.get('/:id/check-options', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ hasOptions: false });

    const hasOptions =
      (product.sizes && product.sizes.length > 0) ||
      (product.colors && product.colors.length > 0);

    res.json({ hasOptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hasOptions: false });
  }
});
router.get('/help', (req, res) => {
  res.render('help');
});

router.get('/size-guide', (req, res) => {
  res.render('size-guide');
});
router.get('/contact', (req, res) => {
  res.render('contact', { message: null });
});

const nodemailer = require("nodemailer");

router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
     function isGmail(email) {
  return email.endsWith("@gmail.com");
}
if (!isGmail(email)) {
  return res.render('contact', { message: "Email must be Gmail" });
}
    // 🔹 إعداد الإرسال (Gmail مثال)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "veekegy@gmail.com",      // 🔴 إيميلك
        pass: "qjpn pzbh gbzb isqu"         // 🔴 App Password (مش الباسورد العادي)
      }
    });

    // 🔹 محتوى الرسالة
    const mailOptions = {
      from: email,
      to: "veekegy@gmail.com", // 🔴 نفس الإيميل أو أي إيميل عايزاه
      subject: "New Contact Message",
      text: `
        Name: ${name}
        Email: ${email}
        
        Message:
        ${message}
      `
    };

    // 🔹 إرسال الإيميل
    await transporter.sendMail(mailOptions);

    res.render('contact', { message: "Your message has been sent successfully!" });

  } catch (err) {
    console.error(err);
    res.render('contact', { message: "There was an error sending your message. Please try again later." });
  }
});



module.exports = router;
