const { Pool } = require("pg");

/* ── Validate DATABASE_URL early ── */
if (!process.env.DATABASE_URL) {
  console.error("─────────────────────────────────────────────────────");
  console.error("❌  DATABASE_URL is not set!");
  console.error("");
  console.error("   On Railway:");
  console.error("   1. Open your app service → Variables tab");
  console.error("   2. Click '+ Add Variable Reference'");
  console.error("   3. Select DATABASE_URL from the Postgres service");
  console.error("   4. Save — the app will redeploy automatically");
  console.error("─────────────────────────────────────────────────────");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err.message);
});

/* ── initDB with retry (handles Railway Postgres slow start) ── */
async function initDB(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS projects (
            id            VARCHAR(50)  PRIMARY KEY,
            title         VARCHAR(255) NOT NULL,
            category      VARCHAR(100) DEFAULT 'Education',
            location      VARCHAR(255) DEFAULT '',
            beneficiaries VARCHAR(255) DEFAULT '',
            year          VARCHAR(50)  DEFAULT '',
            partner       VARCHAR(255) DEFAULT '',
            status        VARCHAR(50)  DEFAULT 'ongoing',
            description   TEXT         DEFAULT '',
            impact        TEXT         DEFAULT '',
            sort_order    INTEGER      DEFAULT 0,
            created_at    TIMESTAMPTZ  DEFAULT NOW(),
            updated_at    TIMESTAMPTZ  DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS photos (
            id           SERIAL      PRIMARY KEY,
            project_id   VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            url          TEXT        NOT NULL,
            caption      VARCHAR(255) DEFAULT '',
            sort_order   INTEGER     DEFAULT 0,
            created_at   TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);

          CREATE TABLE IF NOT EXISTS site_content (
            key         VARCHAR(100) PRIMARY KEY,
            value       TEXT         NOT NULL DEFAULT '',
            updated_at  TIMESTAMPTZ  DEFAULT NOW()
          );
        `);
        console.log("✅ Database schema ready");
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      const isLast = attempt === retries;
      console.error(`❌ DB attempt ${attempt}/${retries} failed: ${err.message}`);
      if (isLast) {
        console.error("Could not connect after all retries. Check DATABASE_URL.");
        throw err;
      }
      console.log(`   Retrying in ${delayMs / 1000}s…`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

module.exports = { pool, initDB };
