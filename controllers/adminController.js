const Admin = require("../models/Admin")
const Product = require("../models/Product")


exports.loginPage=(req,res)=>{
 res.render("admin/login")
}

 exports.login = async (req,res)=>{

const {email,password} = req.body

const admin = await Admin.findOne({email,password})

if(!admin){
  return res.json({success:false})
}

req.session.admin = admin._id

res.json({success:true})


}

exports.dashboard=(req,res)=>{
 res.render("admin/dashboard")
}

// PAGE
exports.productsPage = (req,res)=>{
  res.render("admin/products")
}

// GET ALL
exports.getProducts = async (req,res)=>{
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .populate("categories", "name");
  res.json(products)
}
exports.add_productsPage = async (req,res)=>{
try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render("admin/add-product", { categories });
  } catch (err) {
    console.error(err);
    res.render("admin/add-product", { categories: [] });
  }
}


// ADD
// controllers/adminController.js
exports.addProduct = async (req, res) => {
  try {
    let { name, description, price, salePrice, sizes, colors, stock, sku, weight, country } = req.body;
    
    
    price = Number(price);

    const images = req.files.map(f => "/uploads/" + f.filename);
    const mainImage = images[0];

    sizes = sizes ? sizes.split(",") : [];
    colors = colors ? colors.split(",") : [];
let categories = req.body.category || []; // Express هيرجع array لو اخترت أكتر من واحدة
if (!Array.isArray(categories)) categories = [categories]; // لو checkbox واحد بس

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
      mainImage
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

// DELETE
exports.deleteProduct = async (req,res)=>{
  await Product.findByIdAndDelete(req.params.id)
  res.json({success:true})
}

// GET SINGLE
exports.getSingleProduct = async (req,res)=>{
  const product = await Product.findById(req.params.id)
  res.render("admin/view_product",{product})
}

// UPDATE

// صفحة تعديل المنتج (GET)
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

// تحديث المنتج (POST)
exports.postEditProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.json({ success: false });

    // تحديث البيانات الأساسية
    product.name = req.body.name;
    product.description = req.body.description;
    product.price = Number(req.body.price) || 0;
    product.salePrice = req.body.salePrice || null;
    product.stock = req.body.stock || 0;

    // ======= تحديث الـ categories =======
    // ممكن يكون array أو string
    let categories = req.body['category[]'] || req.body.category || [];
    if (typeof categories === "string") categories = [categories];
    product.categories = categories;

    // ======= تحديث الـ sizes و colors =======
    product.sizes = req.body.sizes ? req.body.sizes.split(",") : [];
    product.colors = req.body.colors ? req.body.colors.split(",") : [];

    // ======= تحديث الصور =======
    if (req.files && req.files.length > 0) {
      const images = req.files.map(f => "/uploads/" + f.filename);
      product.mainImage = images[0];
      product.images = images;
    }

    await product.save();
    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};
const Category = require("../models/Category");

// جلب كل الفئات
exports.getCategories = async (req, res) => {
  
  const categories = await Category.find().sort({ createdAt: -1 });
  res.render("admin/categories", { categories });
};

// إضافة فئة جديدة
exports.postAddCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let image = null;
    if (req.file) image = "/uploads/" + req.file.filename;

    const category = new Category({ name, description, image });
    await category.save();
    res.json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

// تعديل فئة
exports.postEditCategory = async (req, res) => {
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

// حذف فئة
exports.deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const category = await Category.findById(id);
    if (!category) return res.status(404).send("Category not found");

    // 1️⃣ مسح كل المنتجات اللي فيها الكاتيجوري
    await Product.deleteMany({ category: category.name });

    // 2️⃣ مسح الكاتيجوري نفسها
await Category.findByIdAndDelete(category)
    res.redirect("/admin/categories");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};