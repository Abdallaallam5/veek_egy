const router = require("express").Router();
const mongoose = require("mongoose");
const admin = require("../controllers/adminController");
const auth = require("../middleware/adminAuth");
const upload = require("../config/multer");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Category = require("../models/Category");
const Order = require("../models/Order");
const shippingController = require("../controllers/shippingController");

// ===== Admin Auth =====
router.get("/signup", admin.signuppage);
router.post("/signup", admin.signup);
router.get("/login", admin.loginPage);
router.post("/login", admin.login);

// ===== Dashboard =====
router.get("/dashboard", auth, admin.dashboard);

// ===== Products =====
router.get("/products", auth, admin.productsPage);
router.get("/add-product", auth, admin.add_productsPage);
router.get("/products/list", auth, admin.getProducts);

router.post(
  "/products/add",
  auth,
  upload.array("images", 10),
  admin.addProduct
);
router.get("/edit/:id", auth, admin.getEditProduct);
router.post(
  "/products/edit/:id",
  auth,
  upload.array("images"),
  admin.postEditProduct
);
router.delete("/products/delete/:id", auth, admin.deleteProduct);

// ===== Categories =====
router.post(
  "/categories/add",
  auth,
  upload.single("image"),
  admin.postAddCategory
);
router.post("/categories/edit/:id", auth, admin.postEditCategory);
router.delete("/categories/delete/:id", auth, admin.deleteCategory);

// ===== Coupons =====
router.get("/coupon", auth, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render("admin/coupon", { coupons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/create-coupon
// إنشاء أو تعديل كوبون
router.post('/create-coupon', auth,async (req, res) => {
  const { couponId, code, discountType, discountValue, maxUses, expiresAt } = req.body;

  try {
    if(couponId){ 
      await Coupon.findByIdAndUpdate(couponId, {
        code,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        expiresAt: expiresAt || null
      });
    } else { 
      const newCoupon = new Coupon({
        code,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        expiresAt: expiresAt || null
      });
      await newCoupon.save();
    }

    res.redirect('/admin/coupon'); // ارجع لنفس الصفحة
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// حذف كوبون
router.post('/delete-coupon/:id', auth, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.redirect('/admin/coupon'); // ارجع لنفس الصفحة
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ===== Orders =====

// جلب كل الطلبات
router.get("/orders", auth, async (req, res) => {
  try {
    const orders = await Order.find()
  .populate('products.product')
  .sort({ createdAt: -1 });

// تأكد إن كل product موجود
orders.forEach(order => {
  order.products = order.products.filter(item => item.product != null);
});

res.render('admin/order', { orders });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// جلب طلب واحد بالتفاصيل مع التحقق من ObjectId
router.get("/orders/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send("Invalid Order ID");
    }

    const order = await Order.findById(id).populate("products.product");

    if (!order) return res.status(404).send("Order not found");

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
// تغيير الحالة
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after' } // بديل new: true
    );
    if(!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// حذف الأوردر
router.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if(!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Shipping =====

// قائمة محافظات مصر
const egyptGovernorates = [
  "Cairo","Giza","Alexandria","Dakahlia","Red Sea","Beheira",
  "Fayoum","Gharbia","Ismailia","Menofia","Minya","Qaliubiya",
  "New Valley","Suez","Aswan","Assiut","Beni Suef","Port Said",
  "Damietta","Sharkia","South Sinai","Kafr El Sheikh","Matrouh",
  "Luxor","Qena","North Sinai","Sohag"
];

// 1️⃣ API لجلب المحافظات (ممكن تستخدمه في الـ frontend)
router.get("/governorates", auth, (req, res) => {
  res.json(egyptGovernorates);
});

// 2️⃣ صفحة الإدارة للـ shipping
router.get("/shipping-page", auth, (req, res) => {
  res.render("admin/shipping", { governorates: egyptGovernorates });
});

// 3️⃣ API لجلب أسعار الشحن الحالية
router.get("/shipping", auth, shippingController.getShipping);

// 4️⃣ API لتحديث أو إضافة سعر شحن
router.post("/shipping", auth, shippingController.setShipping);

module.exports = router;
