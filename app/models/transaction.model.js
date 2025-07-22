const sql = require("./db.js");

// constructor
const Transaction = function (transaction) {
  this.tanggal = transaction.tanggal;
  this.waktu = transaction.waktu;
  this.nama_akun = transaction.nama_akun;
  this.pemasukan = transaction.pemasukan;
  this.pengeluaran = transaction.pengeluaran;
  this.saldo = transaction.saldo;
  this.keterangan = transaction.keterangan;
};

Transaction.create = (newTransaction, result) => {
  // Get the latest saldo
  sql.query(
    "SELECT saldo FROM transactions ORDER BY id DESC LIMIT 1",
    (err, res) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      }

      let previousSaldo = res.length ? res[0].saldo : 0;
      let pemasukan = newTransaction.pemasukan || 0;
      let pengeluaran = newTransaction.pengeluaran || 0;
      newTransaction.saldo = previousSaldo + pemasukan - pengeluaran;

      // Insert the transaction with calculated saldo
      sql.query(
        "INSERT INTO transactions SET ?",
        newTransaction,
        (err2, res2) => {
          if (err2) {
            console.log("error: ", err2);
            result(err2, null);
            return;
          }

          console.log("created transaction: ", {
            id: res2.insertId,
            ...newTransaction,
          });
          result(null, { id: res2.insertId, ...newTransaction });
        }
      );
    }
  );
};

Transaction.findById = (id, result) => {
  sql.query("SELECT * FROM transactions WHERE id = ?", id, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }

    if (res.length) {
      console.log("found transaction: ", res[0]);
      result(null, res[0]);
      return;
    }

    // not found Transaction with the id
    result({ kind: "not_found" }, null);
  });
};

Transaction.getAll = (tanggal, limit, offset, result) => {
  let query = "SELECT * FROM transactions";
  let queryParams = [];

  if (tanggal) {
    query += " WHERE tanggal LIKE ?";
    queryParams.push(`%${tanggal}%`);
  }

  query += " ORDER BY id DESC";

  // Only apply LIMIT and OFFSET if both are provided and not null
  if (limit !== null && offset !== null) {
    query += " LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));
  }

  sql.query(query, queryParams, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }

    console.log("transactions: ", res);
    result(null, res);
  });
};

// Add a method to get total count for pagination
Transaction.getCount = (tanggal, result) => {
  let query = "SELECT COUNT(*) as total FROM transactions";
  let queryParams = [];

  if (tanggal) {
    query += " WHERE tanggal LIKE ?";
    queryParams.push(`%${tanggal}%`);
  }

  sql.query(query, queryParams, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }

    result(null, res[0].total);
  });
};

Transaction.getAllByDateRange = (start, end, limit, offset, result) => {
  let query = "SELECT * FROM transactions WHERE tanggal BETWEEN ? AND ? ORDER BY tanggal ASC";
  let queryParams = [start, end];

  if (limit && offset !== undefined) {
    query += " LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));
  }

  sql.query(query, queryParams, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }
    result(null, res);
  });
};

Transaction.getCountByDateRange = (start, end, result) => {
  sql.query(
    "SELECT COUNT(*) as total FROM transactions WHERE tanggal BETWEEN ? AND ?",
    [start, end],
    (err, res) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      }
      result(null, res[0].total);
    }
  );
};

Transaction.getAllByAccount = (nama_akun, limit, offset, result) => {
  let query = "SELECT * FROM transactions WHERE nama_akun = ? ORDER BY id DESC";
  let queryParams = [nama_akun];

  if (limit && offset !== undefined) {
    query += " LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));
  }

  sql.query(query, queryParams, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }

    console.log("transactions: ", res);
    result(null, res);
  });
};

Transaction.getCountByAccount = (nama_akun, result) => {
  sql.query(
    "SELECT COUNT(*) as total FROM transactions WHERE nama_akun = ?",
    [nama_akun],
    (err, res) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      }
      result(null, res[0].total);
    }
  );
};

Transaction.updateById = (id, transaction, result) => {
  // First get the original transaction to preserve any fields not being updated
  sql.query("SELECT * FROM transactions WHERE id = ?", id, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }

    if (res.length === 0) {
      result({ kind: "not_found" }, null);
      return;
    }

    const originalTransaction = res[0];
    
    // Calculate saldo adjustment
    const originalPemasukan = originalTransaction.pemasukan || 0;
    const originalPengeluaran = originalTransaction.pengeluaran || 0;
    const newPemasukan = transaction.pemasukan || originalPemasukan;
    const newPengeluaran = transaction.pengeluaran || originalPengeluaran;
    
    // Merge with original values for fields not provided
    const updatedTransaction = {
      tanggal: transaction.tanggal || originalTransaction.tanggal,
      waktu: transaction.waktu || originalTransaction.waktu,
      nama_akun: transaction.nama_akun || originalTransaction.nama_akun,
      pemasukan: newPemasukan,
      pengeluaran: newPengeluaran,
      keterangan: transaction.keterangan || originalTransaction.keterangan,
      // Saldo will be updated below
    };

    // Update this transaction
    sql.query(
      "UPDATE transactions SET tanggal = ?, waktu = ?, pemasukan = ?, pengeluaran = ?, nama_akun = ?, keterangan = ? WHERE id = ?",
      [
        updatedTransaction.tanggal,
        updatedTransaction.waktu,
        updatedTransaction.pemasukan,
        updatedTransaction.pengeluaran,
        updatedTransaction.nama_akun,
        updatedTransaction.keterangan,
        id
      ],
      (err2, res2) => {
        if (err2) {
          console.log("error: ", err2);
          result(err2, null);
          return;
        }

        // Calculate saldo for this transaction and all subsequent transactions
        sql.query(
          "SELECT * FROM transactions WHERE id <= ? ORDER BY id ASC",
          [id],
          (err3, rows) => {
            if (err3) {
              console.log("error: ", err3);
              result(err3, null);
              return;
            }
            
            // Recalculate saldo up to the modified transaction
            let saldo = 0;
            rows.forEach(row => {
              saldo += (row.pemasukan || 0) - (row.pengeluaran || 0);
              
              // Update this transaction's saldo if it's the one we're editing
              if (row.id == id) {
                updatedTransaction.saldo = saldo;
                
                sql.query(
                  "UPDATE transactions SET saldo = ? WHERE id = ?",
                  [saldo, id],
                  (err4) => {
                    if (err4) {
                      console.log("error: ", err4);
                      // Continue anyway
                    }
                  }
                );
              }
            });
            
            // Now update all subsequent transactions
            const netChange = (newPemasukan - newPengeluaran) - (originalPemasukan - originalPengeluaran);
            if (netChange !== 0) {
              sql.query(
                "SELECT * FROM transactions WHERE id > ? ORDER BY id ASC",
                [id],
                (err4, laterRows) => {
                  if (err4 || laterRows.length === 0) {
                    // No later rows or error, just return the result
                    console.log("updated transaction: ", { id: id, ...updatedTransaction });
                    result(null, { id: id, ...updatedTransaction });
                    return;
                  }
                  
                  const updatePromises = laterRows.map((row) => {
                    const newSaldo = row.saldo + netChange;
                    return new Promise((resolve, reject) => {
                      sql.query(
                        "UPDATE transactions SET saldo = ? WHERE id = ?",
                        [newSaldo, row.id],
                        (err5) => {
                          if (err5) reject(err5);
                          else resolve();
                        }
                      );
                    });
                  });
                  
                  Promise.all(updatePromises)
                    .then(() => {
                      console.log("updated transaction: ", { id: id, ...updatedTransaction });
                      result(null, { id: id, ...updatedTransaction });
                    })
                    .catch((err6) => {
                      console.log("error updating later transactions: ", err6);
                      result(err6, null);
                    });
                }
              );
            } else {
              // No saldo changes needed for later transactions
              console.log("updated transaction: ", { id: id, ...updatedTransaction });
              result(null, { id: id, ...updatedTransaction });
            }
          }
        );
      }
    );
  });
};

Transaction.remove = (id, result) => {
  // First, get the transaction to be deleted
  sql.query("SELECT * FROM transactions WHERE id = ?", id, (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }

    if (res.length === 0) {
      // not found Transaction with the id
      result({ kind: "not_found" }, null);
      return;
    }

    const deletedTransaction = res[0];
    const pemasukan = deletedTransaction.pemasukan || 0;
    const pengeluaran = deletedTransaction.pengeluaran || 0;

    // Delete the transaction
    sql.query("DELETE FROM transactions WHERE id = ?", id, (err2, res2) => {
      if (err2) {
        console.log("error: ", err2);
        result(err2, null);
        return;
      }

      // Update saldo for all subsequent transactions
      sql.query(
        "SELECT * FROM transactions WHERE id > ? ORDER BY id ASC",
        id,
        (err3, rows) => {
          if (err3) {
            console.log("error: ", err3);
            result(err3, null);
            return;
          }

          let saldoAdjustment = pemasukan - pengeluaran;
          const updatePromises = rows.map((row) => {
            const newSaldo = row.saldo - saldoAdjustment;
            return new Promise((resolve, reject) => {
              sql.query(
                "UPDATE transactions SET saldo = ? WHERE id = ?",
                [newSaldo, row.id],
                (err4) => {
                  if (err4) reject(err4);
                  else resolve();
                }
              );
            });
          });

          Promise.all(updatePromises)
            .then(() => {
              console.log("deleted transaction with id: ", id);
              result(null, res2);
            })
            .catch((err5) => {
              console.log("error: ", err5);
              result(err5, null);
            });
        }
      );
    });
  });
};

Transaction.removeAll = (result) => {
  sql.query("DELETE FROM transactions", (err, res) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    }

    console.log(`deleted ${res.affectedRows} transactions`);
    result(null, res);
  });
};

module.exports = Transaction;
