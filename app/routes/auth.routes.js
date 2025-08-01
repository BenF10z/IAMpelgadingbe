const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../models/db.js"); // This is now a pool, not a single connection
const { verifyToken } = require("../middleware/authJwt.js");

const secret = process.env.SECRET;
console.log("JWT Secret available:", !!secret);

const changePasswordValidation = [
  body("currentPassword")
    .isLength({ min: 1 })
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),
];

// Login route - Updated to use pool
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("Login attempt for username:", username);

  // Use pool.execute() instead of sql.query()
  pool.execute(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Database error details:", err);
        return res.status(500).json({ message: "DB error" });
      }

      if (results.length === 0)
        return res.status(401).json({ message: "Invalid credentials" });

      const user = results[0];
      const passwordIsValid = password === user.password;
      if (!passwordIsValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          username: user.username,
          id: user.id,
        },
        secret,
        {
          expiresIn: "24h", // Changed from 2minutes
        }
      );
      res.json({ token });
    }
  );
});

// Change password route - Updated to use pool
router.put(
  "/change-password",
  verifyToken,
  changePasswordValidation,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const username = req.user.username;

    // Use pool.execute()
    pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
      (err, results) => {
        if (err) {
          console.error("Database error:", err.message);
          return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = results[0];

        if (currentPassword !== user.password) {
          return res
            .status(401)
            .json({ message: "Current password is incorrect" });
        }

        // Use pool.execute() for update
        pool.execute(
          "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [newPassword, user.id],
          (err, updateResults) => {
            if (err) {
              console.error("Password update error:", err);
              return res.status(500).json({ message: "Internal server error" });
            }

            if (updateResults.affectedRows === 0) {
              return res.status(404).json({ message: "User not found" });
            }

            res.json({ message: "Password changed successfully" });
          }
        );
      }
    );
  }
);

module.exports = (app) => {
  app.use("/api/auth", router);
};
