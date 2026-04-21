const router      = require("express").Router();
const { pool }    = require("../db");
const requireAuth = require("../middleware/auth");

/* helper — fetch projects with their photos */
async function fetchProjects(whereClause = "", values = []) {
  const { rows: projects } = await pool.query(
    `SELECT * FROM projects ${whereClause} ORDER BY sort_order ASC, created_at ASC`,
    values
  );
  if (!projects.length) return projects;

  const ids = projects.map(p => p.id);
  const { rows: photos } = await pool.query(
    `SELECT * FROM photos WHERE project_id = ANY($1) ORDER BY sort_order ASC, created_at ASC`,
    [ids]
  );

  return projects.map(p => ({
    ...p,
    photos: photos.filter(ph => ph.project_id === p.id),
  }));
}

/* ─── PUBLIC ─────────────────────────────────────── */

// GET /api/projects
router.get("/", async (req, res) => {
  try {
    const data = await fetchProjects();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id
router.get("/:id", async (req, res) => {
  try {
    const data = await fetchProjects("WHERE id = $1", [req.params.id]);
    if (!data.length) return res.status(404).json({ error: "Project not found" });
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

/* ─── ADMIN PROTECTED ────────────────────────────── */

// POST /api/projects  — create
router.post("/", requireAuth, async (req, res) => {
  const {
    id, title, category, location, beneficiaries,
    year, partner, status, description, impact, sort_order
  } = req.body;

  if (!id || !title) return res.status(400).json({ error: "id and title are required" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO projects
        (id, title, category, location, beneficiaries, year, partner, status, description, impact, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [id, title, category||"Education", location||"", beneficiaries||"",
       year||"", partner||"", status||"ongoing", description||"", impact||"", sort_order||0]
    );
    res.status(201).json({ ...rows[0], photos: [] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Project ID already exists" });
    console.error(err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// PUT /api/projects/:id  — update
router.put("/:id", requireAuth, async (req, res) => {
  const {
    title, category, location, beneficiaries,
    year, partner, status, description, impact, sort_order
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE projects SET
        title=$1, category=$2, location=$3, beneficiaries=$4,
        year=$5, partner=$6, status=$7, description=$8,
        impact=$9, sort_order=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, category, location, beneficiaries, year, partner,
       status, description, impact, sort_order||0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Project not found" });
    const data = await fetchProjects("WHERE id = $1", [req.params.id]);
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM projects WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Project not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// PATCH /api/projects/reorder  — update sort_order for multiple projects
router.patch("/reorder", requireAuth, async (req, res) => {
  const { order } = req.body; // [{ id, sort_order }]
  if (!Array.isArray(order)) return res.status(400).json({ error: "order must be an array" });

  try {
    await Promise.all(order.map(({ id, sort_order }) =>
      pool.query("UPDATE projects SET sort_order=$1 WHERE id=$2", [sort_order, id])
    ));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder" });
  }
});

/* ─── PHOTOS ─────────────────────────────────────── */

// POST /api/projects/:id/photos  — add a photo
router.post("/:id/photos", requireAuth, async (req, res) => {
  const { url, caption, sort_order } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  // verify project exists
  const { rowCount } = await pool.query("SELECT id FROM projects WHERE id=$1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Project not found" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO photos (project_id, url, caption, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, url, caption||"", sort_order||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add photo" });
  }
});

// DELETE /api/projects/:id/photos/:photoId
router.delete("/:id/photos/:photoId", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM photos WHERE id=$1 AND project_id=$2",
      [req.params.photoId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Photo not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

// PATCH /api/projects/:id/photos/:photoId  — update caption
router.patch("/:id/photos/:photoId", requireAuth, async (req, res) => {
  const { caption, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE photos SET caption=$1, sort_order=$2 WHERE id=$3 AND project_id=$4 RETURNING *",
      [caption||"", sort_order||0, req.params.photoId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Photo not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update photo" });
  }
});

module.exports = router;
