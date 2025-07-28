const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(403).json({ message: "No token provided!" });
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized!" });
    }
    
    req.user = decoded; // Store entire decoded token
    req.userId = decoded.id; // Keep for backward compatibility
    next();
  });
};

module.exports = { verifyToken };