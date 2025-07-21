const jwt = require("jsonwebtoken");
const secret = process.env.SECRET; // Use env variable in production

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(403).json({ message: "No token provided!" });
  }
  const token = authHeader.replace("Bearer ", "");
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    next();
  });
};