module.exports = (app) => {
  const transactions = require("../controllers/transaction.controller.js");
  // Fix: Import verifyToken function specifically
  const { verifyToken } = require("../middleware/authJwt.js");
  const multer = require("multer");
  const upload = multer({ dest: "uploads/" });

  var router = require("express").Router();

  router.post("/upload-csv", verifyToken, upload.single("file"), transactions.uploadCsv);
  
  // Export transactions to CSV
  router.get("/export", verifyToken, transactions.exportToCSV);

  // Create a new Transaction
  router.post("/", verifyToken, transactions.create);

  // Retrieve all Transactions
  router.get("/", verifyToken, transactions.findAll);

  // Retrieve all Transactions by Account
  router.get("/account/:nama_akun", verifyToken, transactions.findAllByAccount);

  // Retrieve all Transactions by Date
  router.get("/date/:tanggal", verifyToken, transactions.findAllByDate);

  // Retrieve a single Transaction with id
  router.get("/:id", verifyToken, transactions.findById);

  // Update a Transaction with id
  router.put("/:id", verifyToken, transactions.updateById);

  // Delete a Transaction with id
  router.delete("/:id", verifyToken, transactions.remove);

  // Delete all Transactions
  router.delete("/", verifyToken, transactions.removeAll);

  // Retrieve all Transactions within a date range
  router.get("/range/:start/:end", verifyToken, transactions.findAllByDateRange);

  app.use("/api/transactions", router);
};
