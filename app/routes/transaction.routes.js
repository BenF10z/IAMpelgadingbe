module.exports = (app) => {
  const transactions = require("../controllers/transaction.controller.js");
  const authJwt = require("../middleware/authJwt.js");
  const multer = require("multer");
  const upload = multer({ dest: "uploads/" });

  var router = require("express").Router();

  router.post("/upload-csv", authJwt, upload.single("file"), transactions.uploadCsv);
  
  // Export transactions to CSV
  router.get("/export", authJwt, transactions.exportToCSV);

  // Create a new Transaction
  router.post("/", authJwt, transactions.create);

  // Retrieve all Transactions
  router.get("/", authJwt, transactions.findAll);

  // Retrieve all Transactions by Account
  router.get("/account/:nama_akun", authJwt, transactions.findAllByAccount);

  // Retrieve all Transactions by Date
  router.get("/date/:tanggal", authJwt, transactions.findAllByDate);

  // Retrieve a single Transaction with id
  router.get("/:id", authJwt, transactions.findById);

  // Update a Transaction with id
  router.put("/:id", authJwt, transactions.updateById);

  // Delete a Transaction with id
  router.delete("/:id", authJwt, transactions.remove);

  // Delete all Transactions
  router.delete("/", authJwt, transactions.removeAll);

  // Retrieve all Transactions within a date range
  router.get("/range/:start/:end", authJwt, transactions.findAllByDateRange);

  app.use("/api/transactions", router);
};
