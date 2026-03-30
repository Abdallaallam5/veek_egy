const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cartController");

router.get("/cart", cartController.getCart);

router.post("/cart/add/:id", cartController.addToCart);

router.post("/cart/remove/:id", cartController.removeFromCart);

router.post("/cart/update", cartController.updateQty);

module.exports = router;