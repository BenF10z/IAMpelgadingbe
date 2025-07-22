const Transaction = require("../models/transaction.model.js");
const fs = require("fs");
const csv = require("csv-parser");
const { Parser } = require("json2csv");

// Export transactions to CSV
exports.exportToCSV = (req, res) => {
  // Define filters if needed (similar to findAll or findAllByDateRange)
  const tanggal = req.query.tanggal;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const nama_akun = req.query.nama_akun;

  // Choose the right query based on provided filters
  let queryFunction = Transaction.getAll;
  let queryParams = [tanggal];

  if (startDate && endDate) {
    // Format dates if provided in dd-mm-yyyy format
    function formatDate(dateStr) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split("-");
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    }

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    queryFunction = Transaction.getAllByDateRange;
    queryParams = [formattedStartDate, formattedEndDate];
  } else if (nama_akun) {
    queryFunction = Transaction.getAllByAccount;
    queryParams = [nama_akun];
  }

  // Execute the appropriate query
  queryFunction(...queryParams, (err, data) => {
    if (err) {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving transactions.",
      });
    } else {
      try {
        // Format dates for display
        const formattedData = data.map((item) => {
          let formattedItem = { ...item };

          if (formattedItem.tanggal) {
            const dateObj = new Date(formattedItem.tanggal);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const year = dateObj.getFullYear();
            formattedItem.tanggal = `${day}-${month}-${year}`;
          }

          if (formattedItem.waktu) {
            const timeObj = new Date(formattedItem.waktu);
            const hours = String(timeObj.getHours()).padStart(2, "0");
            const minutes = String(timeObj.getMinutes()).padStart(2, "0");
            const seconds = String(timeObj.getSeconds()).padStart(2, "0");
            formattedItem.waktu = `${hours}:${minutes}:${seconds}`;
          }

          return formattedItem;
        });

        // Define fields for CSV
        const fields = [
          "id",
          "tanggal",
          "waktu",
          "nama_akun",
          "pemasukan",
          "pengeluaran",
          "saldo",
          "keterangan",
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(formattedData);

        // Set headers for file download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=transactions.csv"
        );

        // Send the CSV file
        res.send(csv);
      } catch (error) {
        res.status(500).send({
          message:
            error.message || "Some error occurred while generating the CSV.",
        });
      }
    }
  });
};

// API to upload CSV and insert into database
exports.uploadCsv = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      // Insert each row into the database
      const insertPromises = results.map((row) => {
        return new Promise((resolve) => {
          // Convert dd-mm-yyyy to yyyy-mm-dd format
          let tanggalFormatted = row.tanggal;
          if (/^\d{2}-\d{2}-\d{4}$/.test(row.tanggal)) {
            const [day, month, year] = row.tanggal.split("-");
            tanggalFormatted = `${year}-${month}-${day}`;
          }
          const transaction = {
            tanggal: tanggalFormatted,
            nama_akun: row.nama_akun,
            pemasukan: parseInt(row.pemasukan) || 0,
            pengeluaran: parseInt(row.pengeluaran) || 0,
            saldo: parseInt(row.saldo) || 0,
            keterangan: row.keterangan,
          };
          Transaction.create(transaction, (err) => {
            resolve(!err); // true if success, false if error
          });
        });
      });

      Promise.all(insertPromises).then((results) => {
        const inserted = results.filter(Boolean).length;
        res.json({ message: `${inserted} transactions uploaded.` });
      });
    });
};

// Create and Save a new Transaction
exports.create = (req, res) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({
      message: "Content can not be empty!",
    });
    return;
  }

  // Create a Transaction
  const inputTanggal = req.body.tanggal;
  let tanggalFormatted = inputTanggal;

  // Convert dd-mm-yyyy to yyyy-mm-dd if needed
  if (/^\d{2}-\d{2}-\d{4}$/.test(inputTanggal)) {
    const [day, month, year] = inputTanggal.split("-");
    tanggalFormatted = `${year}-${month}-${day}`;
  }

  const transaction = new Transaction({
    tanggal: tanggalFormatted,
    waktu: req.body.waktu || null,
    nama_akun: req.body.nama_akun,
    pemasukan: req.body.pemasukan,
    pengeluaran: req.body.pengeluaran,
    saldo: req.body.saldo,
    keterangan: req.body.keterangan,
  });

  // Save Transaction in the database
  Transaction.create(transaction, (err, data) => {
    if (err) {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Transaction.",
      });
    } else {
      res.send(data);
    }
  });
};

// Retrieve all Transactions from the database (with condition and optional pagination).
exports.findAll = (req, res) => {
  const tanggal = req.query.tanggal;
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  
  // If both page and limit are specified, use pagination
  if (page && limit) {
    const offset = (page - 1) * limit;
    
    // Get total count first
    Transaction.getCount(tanggal, (err, total) => {
      if (err) {
        res.status(500).send({
          message: err.message || "Some error occurred while counting transactions.",
        });
        return;
      }

      // Then get the paginated data
      Transaction.getAll(tanggal, limit, offset, (err, data) => {
        if (err) {
          res.status(500).send({
            message: err.message || "Some error occurred while retrieving transactions.",
          });
        } else {
          // Format tanggal to dd-mm-yyyy
          const formattedData = data.map((item) => {
            if (item.tanggal) {
              const dateObj = new Date(item.tanggal);
              const day = String(dateObj.getDate()).padStart(2, "0");
              const month = String(dateObj.getMonth() + 1).padStart(2, "0");
              const year = dateObj.getFullYear();
              item.tanggal = `${day}-${month}-${year}`;
            }

            // Format waktu to match database format (HH:MM:SS)
            if (item.waktu) {
              const timeObj = new Date(item.waktu);
              const hours = String(timeObj.getHours()).padStart(2, "0");
              const minutes = String(timeObj.getMinutes()).padStart(2, "0");
              const seconds = String(timeObj.getSeconds()).padStart(2, "0");
              item.waktu = `${hours}:${minutes}:${seconds}`;
            }
            return item;
          });

          const totalPages = Math.ceil(total / limit);

          res.send({
            data: formattedData,
            pagination: {
              currentPage: page,
              totalPages: totalPages,
              totalItems: total,
              itemsPerPage: limit,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1
            }
          });
        }
      });
    });
  } else {
    // No pagination - return all transactions
    Transaction.getAll(tanggal, null, null, (err, data) => {
      if (err) {
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving transactions.",
        });
      } else {
        // Format tanggal to dd-mm-yyyy
        const formattedData = data.map((item) => {
          if (item.tanggal) {
            const dateObj = new Date(item.tanggal);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const year = dateObj.getFullYear();
            item.tanggal = `${day}-${month}-${year}`;
          }

          // Format waktu to match database format (HH:MM:SS)
          if (item.waktu) {
            const timeObj = new Date(item.waktu);
            const hours = String(timeObj.getHours()).padStart(2, "0");
            const minutes = String(timeObj.getMinutes()).padStart(2, "0");
            const seconds = String(timeObj.getSeconds()).padStart(2, "0");
            item.waktu = `${hours}:${minutes}:${seconds}`;
          }
          return item;
        });

        // Return data directly without pagination wrapper
        res.send(formattedData);
      }
    });
  }
};

exports.findAllByDateRange = (req, res) => {
  // Convert dd-mm-yyyy to yyyy-mm-dd for both start and end
  function formatDate(dateStr) {
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split("-");
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  }
  const start = formatDate(req.params.start);
  const end = formatDate(req.params.end);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Get total count first
  Transaction.getCountByDateRange(start, end, (err, total) => {
    if (err) {
      res.status(500).send({
        message: err.message || "Some error occurred while counting transactions.",
      });
      return;
    }

    // Then get the paginated data
    Transaction.getAllByDateRange(start, end, limit, offset, (err, data) => {
      if (err) {
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving transactions.",
        });
      } else {
        // Format tanggal to dd-mm-yyyy
        const formattedData = data.map((item) => {
          if (item.tanggal) {
            const dateObj = new Date(item.tanggal);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const year = dateObj.getFullYear();
            item.tanggal = `${day}-${month}-${year}`;
          }

          // Format waktu to match database format (HH:MM:SS)
          if (item.waktu) {
            const timeObj = new Date(item.waktu);
            const hours = String(timeObj.getHours()).padStart(2, "0");
            const minutes = String(timeObj.getMinutes()).padStart(2, "0");
            const seconds = String(timeObj.getSeconds()).padStart(2, "0");
            item.waktu = `${hours}:${minutes}:${seconds}`;
          }
          return item;
        });

        const totalPages = Math.ceil(total / limit);

        res.send({
          data: formattedData,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        });
      }
    });
  });
};

// Retrieve all Transactions by Account
exports.findAllByAccount = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Get total count first
  Transaction.getCountByAccount(req.params.nama_akun, (err, total) => {
    if (err) {
      res.status(500).send({
        message: err.message || "Some error occurred while counting transactions.",
      });
      return;
    }

    // Then get the paginated data
    Transaction.getAllByAccount(req.params.nama_akun, limit, offset, (err, data) => {
      if (err) {
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving transactions.",
        });
      } else {
        // Format tanggal to dd-mm-yyyy and waktu
        const formattedData = data.map((item) => {
          if (item.tanggal) {
            const dateObj = new Date(item.tanggal);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const year = dateObj.getFullYear();
            item.tanggal = `${day}-${month}-${year}`;
          }

          // Format waktu to match database format (HH:MM:SS)
          if (item.waktu) {
            const timeObj = new Date(item.waktu);
            const hours = String(timeObj.getHours()).padStart(2, "0");
            const minutes = String(timeObj.getMinutes()).padStart(2, "0");
            const seconds = String(timeObj.getSeconds()).padStart(2, "0");
            item.waktu = `${hours}:${minutes}:${seconds}`;
          }
          return item;
        });

        const totalPages = Math.ceil(total / limit);

        res.send({
          data: formattedData,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        });
      }
    });
  });
};

// Find a single Transaction with a id
exports.findById = (req, res) => {
  Transaction.findById(req.params.id, (err, data) => {
    if (err) {
      if (err.kind === "not_found") {
        res.status(404).send({
          message: `Not found Transaction with id ${req.params.id}.`,
        });
      } else {
        res.status(500).send({
          message: "Error retrieving Transaction with id " + req.params.id,
        });
      }
    } else {
      // Format tanggal to dd-mm-yyyy
      if (data.tanggal) {
        const dateObj = new Date(data.tanggal);
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const year = dateObj.getFullYear();
        data.tanggal = `${day}-${month}-${year}`;
      }

      // Format waktu to match database format (HH:MM:SS)
      if (data.waktu) {
        const timeObj = new Date(data.waktu);
        const hours = String(timeObj.getHours()).padStart(2, "0");
        const minutes = String(timeObj.getMinutes()).padStart(2, "0");
        const seconds = String(timeObj.getSeconds()).padStart(2, "0");
        data.waktu = `${hours}:${minutes}:${seconds}`;
      }
      res.send(data);
    }
  });
};

// Update a Transaction identified by the id in the request
exports.updateById = (req, res) => {
  // Validate Request
  if (!req.body) {
    res.status(400).send({
      message: "Content can not be empty!",
    });
    return; // Add return statement here to prevent further execution
  }

  // Format the date if it exists in the request
  let updatedData = { ...req.body };

  if (updatedData.tanggal) {
    // Convert dd-mm-yyyy to yyyy-mm-dd if needed
    if (/^\d{2}-\d{2}-\d{4}$/.test(updatedData.tanggal)) {
      const [day, month, year] = updatedData.tanggal.split("-");
      updatedData.tanggal = `${year}-${month}-${day}`;
    }
  }

  // Create transaction object with formatted data
  const transaction = new Transaction(updatedData);

  Transaction.updateById(req.params.id, transaction, (err, data) => {
    if (err) {
      if (err.kind === "not_found") {
        res.status(404).send({
          message: `Not found Transaction with id ${req.params.id}.`,
        });
      } else {
        res.status(500).send({
          message: "Error updating Transaction with id " + req.params.id,
        });
      }
    } else {
      // Format the response data for consistency
      if (data.tanggal) {
        const dateObj = new Date(data.tanggal);
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const year = dateObj.getFullYear();
        data.tanggal = `${day}-${month}-${year}`;
      }

      if (data.waktu) {
        const timeObj = new Date(data.waktu);
        const hours = String(timeObj.getHours()).padStart(2, "0");
        const minutes = String(timeObj.getMinutes()).padStart(2, "0");
        const seconds = String(timeObj.getSeconds()).padStart(2, "0");
        data.waktu = `${hours}:${minutes}:${seconds}`;
      }

      res.send(data);
    }
  });
};

// Delete a Transaction with the specified id in the request
exports.remove = (req, res) => {
  Transaction.remove(req.params.id, (err, data) => {
    if (err) {
      if (err.kind === "not_found") {
        res.status(404).send({
          message: `Not found Transaction with id ${req.params.id}.`,
        });
      } else {
        res.status(500).send({
          message: "Could not delete Transaction with id " + req.params.id,
        });
      }
    } else {
      res.send({ message: `Transaction was deleted successfully!` });
    }
  });
};

// Delete all Transactions from the database.
exports.removeAll = (req, res) => {
  Transaction.removeAll((err, data) => {
    if (err) {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all transactions.",
      });
    } else {
      res.send({ message: `All Transactions were deleted successfully!` });
    }
  });
};

// Retrieve all Transactions by Date
exports.findAllByDate = (req, res) => {
  Transaction.getAllByDate(req.params.tanggal, (err, data) => {
    if (err) {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving transactions.",
      });
    } else {
      // Format tanggal to dd-mm-yyyy and waktu
      const formattedData = data.map((item) => {
        if (item.tanggal) {
          const dateObj = new Date(item.tanggal);
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();
          item.tanggal = `${day}-${month}-${year}`;
        }

        // Format waktu to match database format (HH:MM:SS)
        if (item.waktu) {
          const timeObj = new Date(item.waktu);
          const hours = String(timeObj.getHours()).padStart(2, "0");
          const minutes = String(timeObj.getMinutes()).padStart(2, "0");
          const seconds = String(timeObj.getSeconds()).padStart(2, "0");
          item.waktu = `${hours}:${minutes}:${seconds}`;
        }
        return item;
      });
      res.send(formattedData);
    }
  });
};

// Retrieve all Transactions by Date and Account
exports.findAllByDateAndAccount = (req, res) => {
  Transaction.getAllByDateAndAccount(
    req.params.tanggal,
    req.params.nama_akun,
    (err, data) => {
      if (err) {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving transactions.",
        });
      } else {
        // Format tanggal to dd-mm-yyyy and waktu
        const formattedData = data.map((item) => {
          if (item.tanggal) {
            const dateObj = new Date(item.tanggal);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const year = dateObj.getFullYear();
            item.tanggal = `${day}-${month}-${year}`;
          }

          // Format waktu to match database format (HH:MM:SS)
          if (item.waktu) {
            const timeObj = new Date(item.waktu);
            const hours = String(timeObj.getHours()).padStart(2, "0");
            const minutes = String(timeObj.getMinutes()).padStart(2, "0");
            const seconds = String(timeObj.getSeconds()).padStart(2, "0");
            item.waktu = `${hours}:${minutes}:${seconds}`;
          }
          return item;
        });
        res.send(formattedData);
      }
    }
  );
};
