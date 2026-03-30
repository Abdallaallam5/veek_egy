const User = require("../models/User");
const bcrypt = require("bcryptjs");

// GET Signup
exports.getSignup = (req, res) => res.render("signup");

// POST Signup
exports.postSignup = async (req, res) => {
    const { name, email, password } = req.body;
    // تحقق من البريد مسبقًا، تشفير الباسورد، الخ...
    res.send("Sign Up success (placeholder)");
};

// GET Login
exports.getLogin = (req, res) => res.render("login");

// POST Login
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    // التحقق من الحساب
    res.send("Login success (placeholder)");
};