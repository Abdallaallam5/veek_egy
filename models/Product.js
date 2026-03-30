const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  saleType: {
    type: String,
    enum: ["none","percentage","fixed","salePrice"],
    default: "none"
  },
  discountValue: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  images: [String],
  mainImage: String,
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  sizes: [String],
  colors: [String],
  stock: { type: Number, default: 0 },
  sku: String,
  weight: Number,
  country: String
}, { timestamps: true });

// ✅ دالة احترافية لحساب السعر النهائي
productSchema.methods.getFinalPrice = function () {
  const price = Number(this.price);
  const discount = Number(this.discountValue);
  const salePrice = Number(this.salePrice);

  if (!price || isNaN(price)) return 0;

  let finalPrice = price;

  if (this.saleType === "percentage" && discount) {
    finalPrice -= (price * discount / 100);
  } else if (this.saleType === "fixed" && discount) {
    finalPrice -= discount;
  } else if (this.saleType === "salePrice" && salePrice) {
    finalPrice = salePrice;
  }

  if (finalPrice < 0) finalPrice = 0;

  return Math.round(finalPrice);
};

module.exports = mongoose.model("Product", productSchema);