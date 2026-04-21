require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { initDB, pool } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── API Routes ── */
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/content",  require("./routes/content"));
app.get("/api/health",   (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

/* ── Static files ── */
const CLIENT_DIST   = path.join(__dirname, "..", "client", "dist");
const CLIENT_PUBLIC = path.join(__dirname, "..", "client", "public");

app.get("/",         (_req, res) => res.sendFile(path.join(CLIENT_PUBLIC, "index-home.html")));
app.get("/projects", (_req, res) => res.sendFile(path.join(CLIENT_DIST,   "index.html")));
app.use(express.static(CLIENT_DIST));
app.use(express.static(CLIENT_PUBLIC));
app.get("*", (_req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));

/* ── Auto-seed if database is empty ── */
async function autoSeed() {
  const { rows } = await pool.query("SELECT COUNT(*) FROM projects");
  if (parseInt(rows[0].count) > 0) {
    console.log(`✅ Database already has ${rows[0].count} projects — skipping seed`);
    return;
  }
  console.log("🌱 Empty database detected — running auto-seed…");
  const { seedAll } = require("./seed");
  await seedAll();
  console.log("✅ Auto-seed complete — all projects loaded!");
}

(async () => {
  await initDB();
  await autoSeed();
  app.listen(PORT, () => {
    console.log(`🚀 Shuddhi Trust server running on port ${PORT}`);
    console.log(`   Homepage:     http://localhost:${PORT}/`);
    console.log(`   Projects:     http://localhost:${PORT}/projects`);
    console.log(`   API:          http://localhost:${PORT}/api/`);
  });
})();
