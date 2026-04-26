const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require("path");
const multer = require("multer-storage-cloudinary"); 
const cloudinary = require("cloudinary").v2;

require("dotenv").config();

const app = express();
app.use(express.static("public"));
// Session
app.use(session({
  secret: "veek_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// View Engine (مهم لـ Render)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Cart middleware
const cartCountMiddleware = require('./middleware/cartCount');
app.use(cartCountMiddleware);

// MongoDB
const uri = "mongodb+srv://lomadoma80_db_user:UdX7mkJLQngHWVIK@cluster0.brwmhlm.mongodb.net/veek_db?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.log("MongoDB connection error:", err));

// Routes
app.use("/user", require("./routes/userRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/", require("./routes/productRoutes"));
app.use("/checkout", require("./routes/checkoutRoutes"));
app.use("/cart", require("./routes/cartRoutes"));

const cartRoutes = require("./routes/cartRoutes");
app.use("/", cartRoutes);

// uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 404
app.use((req, res) => {
  res.status(404).render("404");
});

// Server
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;
