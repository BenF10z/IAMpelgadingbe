const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sql = require("../models/db.js");

const secret = process.env.SECRET; // Use env variable in production
console.log("JWT Secret available:", !!secret); // Check if secret is loaded

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

      const token = jwt.sign({ username: user.username }, secret, {
        expiresIn: "24h",
      });
      res.json({ token });
    }
  );
});

module.exports = (app) => {
  app.use("/api/auth", router);
};
