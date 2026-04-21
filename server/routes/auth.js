const router  = require("express").Router();
const jwt     = require("jsonwebtoken");

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, expiresIn: 43200 });
});

// GET /api/auth/verify  — check if token is still valid
router.get("/verify", require("../middleware/auth"), (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
