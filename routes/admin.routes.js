const router = require("express").Router();
const {
  loginAdmin,
  countCustomers,
  countOrders,
  countProducts,
  countCategories,
  getCategoriesWithCounts,
  getAllOrders,
  getAllUsers,
  addEmployee,
  updatePassword,
  getAllEmployee,
} = require("../controllers/admin.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

// API Admin
router.post("/admin/login", loginAdmin);
router.post("/add/employee", addEmployee);
router.put("/change-password", restrict, updatePassword);
router.get("/count/customers", restrict, countCustomers);
router.get("/count/orders", restrict, countOrders);
router.get("/count/products", restrict, countProducts);
router.get("/count/categories", restrict, countCategories);
router.get("/data/product", restrict, getCategoriesWithCounts);
router.get("/all/orders", restrict, getAllOrders);
router.get("/all/users", restrict, getAllUsers);
router.get("/all/employees", restrict, getAllEmployee);

module.exports = router;
