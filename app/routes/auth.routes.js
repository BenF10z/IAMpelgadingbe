const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const sql = require("../models/db.js");
const { verifyToken } = require("../middleware/authJwt.js");

const secret = process.env.SECRET; // Use env variable in production
console.log("JWT Secret available:", !!secret); // Check if secret is loaded

// Validation middleware for change password
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

// Change password endpoint
router.put(
  "/change-password",
  verifyToken,
  changePasswordValidation,
  (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const username = req.user.username; // From JWT token

    // First, get the current user's password from database
    sql.query(
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

        // Verify current password (plain text comparison)
        if (currentPassword !== user.password) {
          return res
            .status(401)
            .json({ message: "Current password is incorrect" });
        }

        // Update password in database (store as plain text)
        sql.query(
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

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  sql.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (results.length === 0)
        return res.status(401).json({ message: "Invalid credentials" });

      const user = results[0];
      // If passwords are hashed in DB, use bcrypt.compareSync
      // If plain text, use direct comparison
      const passwordIsValid = password === user.password;
      if (!passwordIsValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { 
          username: user.username,
          id: user.id 
        }, 
        secret, 
        {
          expiresIn: "2minutes" // Token expiration time
        }
      );
      res.json({ token });
    }
  );
});

module.exports = (app) => {
  app.use("/api/auth", router);
};
