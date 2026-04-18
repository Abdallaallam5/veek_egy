const Admin = require("../models/Admin");
const Product = require("../models/Product");
const Category = require("../models/Category");
const bcrypt = require("bcrypt");

// ================= AUTH =================

exports.signuppage = (req, res) => {
  res.render("admin/signup");
};

exports.signup = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password are required" });
  }

  const existingAdmin = await Admin.findOne({ email });

  if (existingAdmin) {
    return res.json({ success: false, message: "Admin already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await Admin.create({ email, password: hashedPassword });

  res.json({ success: true });
};

exports.loginPage = (req, res) => {
  res.render("admin/login");
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password are required" });
  }

  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.json({ success: false, message: "Admin not found" });
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.json({ success: false, message: "Incorrect password" });
  }

  req.session.admin = admin._id;
  res.json({ success: true });
};

// ================= DASHBOARD =================

exports.dashboard = (req, res) => {
  res.render("admin/dashboard");
};

// ================= PRODUCTS =================

exports.productsPage = (req, res) => {
  res.render("admin/products");
};

exports.getProducts = async (req, res) => {
  const products = await Product.find()
    .sort({ createdAt: -1 })
    .populate("categories", "name");

  res.json(products);
};

exports.add_productsPage = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render("admin/add-product", { categories });
  } catch (err) {
    console.error(err);
    res.render("admin/add-product", { categories: [] });
  }
};

// ================= ADD PRODUCT (CLOUDINARY FIXED) =================

exports.addProduct = async (req, res) => {
  try {
    let {
      name,
      description,
      price,
      salePrice,
      sizes,
      colors,
      stock,
      sku,
      weight,
      country,
    } = req.body;

    price = Number(price);

    // 🔥 CLOUDINARY FIX
    const images = req.files ? req.files.map(file => file.path) : [];
    const mainImage = images[0] || null;

    sizes = sizes ? sizes.split(",") : [];
    colors = colors ? colors.split(",") : [];

    let categories = req.body.category || [];
    if (!Array.isArray(categories)) categories = [categories];

    await Product.create({
      name,
      description,
      price,
      salePrice: salePrice || null,
      categories,
      sizes,
      colors,
      stock,
      sku,
      weight,
      country,
      images,
      mainImage,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

// ================= DELETE PRODUCT =================

exports.deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

// ================= SINGLE PRODUCT =================

exports.getSingleProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.render("admin/view_product", { product });
};

// ================= EDIT PRODUCT =================

exports.getEditProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find().sort({ createdAt: -1 });

    if (!product) return res.redirect("/admin/products");

    res.render("admin/edit-product", { product, categories });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/products");
  }
};

exports.postEditProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.json({ success: false });

    product.name = req.body.name;
    product.description = req.body.description;
    product.price = Number(req.body.price) || 0;
    product.salePrice = req.body.salePrice || null;
    product.stock = req.body.stock || 0;

    let categories = req.body["category[]"] || req.body.category || [];
    if (typeof categories === "string") categories = [categories];
    product.categories = categories;

    product.sizes = req.body.sizes ? req.body.sizes.split(",") : [];
    product.colors = req.body.colors ? req.body.colors.split(",") : [];

    // 🔥 CLOUDINARY UPDATE IMAGES
    if (req.files && req.files.length > 0) {
      const images = req.files.map(file => file.path);
      product.images = images;
      product.mainImage = images[0];
    }

    await product.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

// ================= CATEGORIES =================

exports.getCategories = async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  res.render("admin/categories", { categories });
};

const cloudinary = require("cloudinary").v2;

exports.postAddCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    let image = null;

    if (req.file && req.file.buffer) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "categories" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      image = result.secure_url;
    }

    const category = await Category.create({
      name,
      description,
      image,
    });

    return res.json({ success: true, category });

  } catch (err) {
    console.log("❌ CATEGORY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};exports.postEditCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.json({ success: false });

    category.name = req.body.name;
    category.description = req.body.description;

    if (req.file) category.image = req.file.path;

    await category.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

// ================= DELETE CATEGORY (FIXED) =================

exports.deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const category = await Category.findById(id);
    if (!category) return res.status(404).send("Category not found");

    // 🔥 FIX: correct field is categories (array of ObjectIds)
    await Product.deleteMany({ categories: category._id });

    await Category.findByIdAndDelete(id);

    res.redirect("/admin/categories");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};
