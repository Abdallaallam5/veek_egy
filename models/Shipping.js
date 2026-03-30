const mongoose = require('mongoose');

const ShippingSchema = new mongoose.Schema({
  governorate: { type: String, required: true, unique: true },
  price: { type: Number, required: true }
});

module.exports = mongoose.model('Shipping', ShippingSchema);