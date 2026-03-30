const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/userController");

router.get("/signup", userCtrl.getSignup);
router.post("/signup", userCtrl.postSignup);

router.get("/login", userCtrl.getLogin);
router.post("/login", userCtrl.postLogin);

module.exports = router;