const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");


require("dotenv").config();

const app = express();
const session = require("express-session");
app.use(session({
  secret:"veek_secret",
  resave:false,
  saveUninitialized:false,
  cookie:{
    maxAge:1000*60*60*24*7
  }
}));

app.use((req, res, next) => {
  const cart = req.session.cart || [];

  res.locals.cartCount = cart.reduce((total, item) => {
    return total + item.qty;
  }, 0);

  next();
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// View Engine
app.set("view engine", "ejs");

// MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Routes
app.use("/user", require("./routes/userRoutes"));    
app.use("/admin", require("./routes/adminRoutes"));      
app.use("/", require("./routes/productRoutes"));
app.use("/checkout", require("./routes/checkoutRoutes"));

app.use("/uploads", express.static("public/uploads"));

const cartRoutes = require("./routes/cartRoutes");
app.use("/", cartRoutes);
const path = require("path");

// الملفات اللي في uploads تبقى متاحة
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// 404
app.use((req, res) => {
  res.status(404).render("404");
});


// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));