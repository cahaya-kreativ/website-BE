const express = require('express');
const router = express.Router();
const swaggerUI = require("swagger-ui-express");
const YAML = require("yaml");
const fs = require("fs");
const path = require("path");

// Import File routes
const User = require("./user.routes")
const Profile = require("./profile.routes")
const Product = require("./product.routes")
const Category = require("./category.routes")
const Portfolio = require("./portfolio.routes")
const Order = require("./order.routes")
const Payment = require("./payment.routes")
const Notification = require("./notification.routes")
const Review = require("./review.routes")
const Schedule = require("./schedule.routes")
const Discount = require("./discount.routes")
const Chat = require("./chat.routes")
const Gallery = require("./gallery.routes")
const Admin = require("./admin.routes")

const swagger_path = path.resolve(__dirname, "../docs/api-docs.yaml");
const customCssUrl =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css";
const customJs = [
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js",
];
const file = fs.readFileSync(swagger_path, "utf-8");

// API Docs
const swaggerDocument = YAML.parse(file);
router.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument, { customCssUrl, customJs }));

// API
router.use("/api/v1", User)
router.use("/api/v1", Profile)
router.use("/api/v1", Product)
router.use("/api/v1", Category)
router.use("/api/v1", Portfolio)
router.use("/api/v1", Order)
router.use("/api/v1", Payment)
router.use("/api/v1", Notification)
router.use("/api/v1", Review)
router.use("/api/v1", Schedule)
router.use("/api/v1", Discount)
router.use("/api/v1", Chat)
router.use("/api/v1", Gallery)
router.use("/api/v1", Admin)

module.exports = router;