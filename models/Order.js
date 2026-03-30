// models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, default: 1 },
        size: String,
        color: String,
        price: Number // السعر وقت الطلب (لحفظ السعر حتى لو تغير المنتج لاحقًا)
    }],
    totalPrice: { type: Number, required: true }, // مجموع المنتجات فقط
    shippingPrice: { type: Number, default: 0 }, // سعر الشحن حسب المحافظة
    finalPrice: { type: Number, default: 0 }, // totalPrice + shippingPrice - discount
    governorate: String, // المحافظة اللي اختارها العميل
    customerName: String,
    customerEmail: String,
    customerAddress: String,
    status: { type: String, default: 'pending' },

    // إضافة معلومات الكوبون
    couponCode: { type: String, default: null }, // الكود لو استُخدم
    discount: { type: Number, default: 0 } // قيمة الخصم المطبقة
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);