// utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOrderEmail = async (toEmail, name) => {
  await transporter.sendMail({
    from: `"Veek Store" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Order Confirmation",
    html: `
      <h2>Hello ${name} </h2>
      <p>Your order has been placed successfully </p>
      <p>It will arrive within <strong>7 - 9 business days</strong>.</p>
      <p>Thank you for shopping with us ❤️</p>
    `
  });
};