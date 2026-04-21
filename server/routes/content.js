const router      = require("express").Router();
const { pool }    = require("../db");
const requireAuth = require("../middleware/auth");

/* Default content — used when DB has no value yet */
const DEFAULTS = {
  /* Stats */
  "stat.projects":      "28+",
  "stat.students":      "10,000+",
  "stat.disability":    "700+",
  "stat.women":         "1,500+",
  "stat.lives":         "12,000+",
  /* Hero */
  "hero.title":         "Empowering Lives Through Education",
  "hero.subtitle":      "Building Inclusive Communities Across Rural Karnataka",
  "hero.description":   "Since 2015, Shuddhi Educational Charitable Trust has been creating sustainable opportunities for underprivileged children, youth, and women — irrespective of caste, creed, or religion.",
  /* Mission */
  "mission.body":       "Our mission at Shuddhi Educational Charitable Trust is to create inclusive and sustainable opportunities for underprivileged and deserving individuals through quality education, infrastructure development, and welfare initiatives. We are committed to empowering youth, supporting women's independence, and enabling children—including those with special needs—to access meaningful learning and growth.\n\nThrough the establishment of schools, modern classrooms, hostels, and innovative audio-visual learning programs, along with scholarships and NEET coaching, we strive to enhance educational outcomes, especially in rural areas. By fostering equality beyond caste, creed, and religion, we aim to build confident individuals, strengthen communities, and contribute to a more just and progressive society.",
  /* Vision */
  "vision.body":        "Our vision is to build a society where education, empowerment, and opportunity are accessible to all, regardless of social or economic background. Shuddhi Educational Charitable Trust envisions a future where underprivileged children, youth, and women can achieve their full potential through quality education, skill development, and supportive infrastructure. We aspire to create inclusive communities where every individual is equipped to lead a dignified, productive, and empowered life.",
  /* About */
  "about.para1":        "Shuddhi Educational Charitable Trust is a registered non-profit organisation established in 2015 with a strong commitment to empowering communities through education, infrastructure development, and social welfare initiatives. We work with a vision to uplift underprivileged and deserving individuals, ensuring equal opportunities for all, irrespective of caste, creed, or religion.",
  "about.para2":        "Over the years, the Trust has actively contributed to educational infrastructure by constructing school buildings, well-equipped classrooms, and modern audio-visual learning rooms. In collaboration with Manipal Foundation, we have successfully conducted audio-visual learning programs across Tumkur and Madhugiri educational districts since 2015 — significantly improving SSLC results among rural students.",
  "about.para3":        "Our initiatives extend beyond traditional education — dedicated facilities for children with hearing and speech impairments, buildings for mentally challenged children, tailoring and skill development for women, nutritional assistance for mothers, and recreational equipment for schools.",
  /* Testimonials */
  "testimonial.1.name": "K. Gopal Krishna",
  "testimonial.1.role": "President, Gram Panchayat, Madhur",
  "testimonial.1.body": "We had been providing services for mentally challenged children at Deen Dayal Buds Rehabilitation Center in a temporary shed, without proper facilities. We approached Shuddhi Charitable Trust for support, and thanks to their generous assistance, we now have a well-equipped building with modern amenities, including benches, audio-visual equipment, and study and play materials. This facility significantly enhances our ability to care for and educate the children in our Gram Panchayat.",
  "testimonial.2.name": "Radhamma",
  "testimonial.2.role": "Tailoring Training Beneficiary",
  "testimonial.2.body": "Joining the tailoring training program has been life-changing for me. I learned valuable skills that have helped me earn a steady income and support my family. The training boosted my confidence and gave me the independence I had always hoped for. I am truly grateful to the institute for empowering me and other women like me.",
  "testimonial.3.name": "Jayalakshmi C H",
  "testimonial.3.role": "Kallakatta MAUP School, Kasargod",
  "testimonial.3.body": "The support from Shuddhi Charitable Trust has completely transformed our school. With the revival of the school bus, audio-visual equipment, computer labs, office benches and desks, and kitchen utensils, our students now have access to better learning facilities and a more comfortable school environment. This assistance has greatly improved both academic and extracurricular activities, benefiting the entire school community.",
  "testimonial.4.name": "Ravi",
  "testimonial.4.role": "Scholarship Recipient",
  "testimonial.4.body": "Receiving the scholarship from Shuddhi Charitable Trust has been a tremendous support for my higher education. The financial assistance helped me cover tuition and other expenses, allowing me to focus on my studies without worry. This scholarship has motivated me to work harder and pursue my academic and professional goals with confidence. I am truly grateful for this invaluable support.",
  /* Contact */
  "contact.email":      "info@shuddhitrust.org",
  "contact.phone":      "+91 — — — — — — — —",
  "contact.address":    "Tumkur, Karnataka, India",
  "contact.website":    "shuddhitrust.org",
};

/* GET /api/content — returns all keys merged with defaults */
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT key, value FROM site_content");
    const db = Object.fromEntries(rows.map(r => [r.key, r.value]));
    // Merge: DB values override defaults
    const merged = { ...DEFAULTS, ...db };
    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load content" });
  }
});

/* PUT /api/content — upsert multiple keys at once (admin only)
   Body: { "hero.title": "New Title", "stat.projects": "30+", ... } */
router.put("/", requireAuth, async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== "object") {
    return res.status(400).json({ error: "Body must be an object of key:value pairs" });
  }

  try {
    const entries = Object.entries(updates);
    if (!entries.length) return res.json({ updated: 0 });

    await Promise.all(entries.map(([key, value]) =>
      pool.query(
        `INSERT INTO site_content (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      )
    ));

    res.json({ updated: entries.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save content" });
  }
});

/* GET /api/content/defaults — expose defaults for reset functionality */
router.get("/defaults", requireAuth, (_req, res) => {
  res.json(DEFAULTS);
});

module.exports = router;
