const Shipping = require("../models/Shipping"); // موديل جديد فيه governorate + price

// جلب كل المحافظات وأسعارها
exports.getShipping = async (req, res) => {
  try {
    const Shipping = require("../models/Shipping"); // نموذجك للـ shipping
    const data = await Shipping.find().sort({ governorate: 1 });
    res.json(data); // مهم جدا JSON
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setShipping = async (req, res) => {
  try {
    const Shipping = require("../models/Shipping");
    const { governorate, price } = req.body;

    const existing = await Shipping.findOne({ governorate });
    if(existing){
      existing.price = price;
      await existing.save();
    } else {
      await Shipping.create({ governorate, price });
    }

    res.json({ success: true });
  } catch(err){
    res.status(500).json({ error: err.message });
  }
};
