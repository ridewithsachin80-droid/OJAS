require('dotenv').config();
const { notify } = require('./notifications');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { pool, initDB, defaultMilestones } = require('./db');
const { auth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_prod';

// Multer — memory storage, 20MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf','image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ══════════════════════════════════════════
// ADMIN PROFILE & NOTIFICATION SETTINGS
// ══════════════════════════════════════════
app.get('/api/admin/profile', auth('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT id,email,full_name,mobile,pan FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/profile', auth('admin'), async (req, res) => {
  const { full_name, email, mobile, pan } = req.body;
  try {
    // Check email not taken by another user
    if (email) {
      const existing = await pool.query('SELECT id FROM users WHERE email=$1 AND id!=$2', [email.toLowerCase(), req.user.id]);
      if (existing.rows.length) return res.status(400).json({ error: 'Email already in use' });
    }
    await pool.query(
      'UPDATE users SET full_name=$1,email=$2,mobile=$3,pan=$4,updated_at=NOW() WHERE id=$5',
      [full_name, email?.toLowerCase()||req.user.email, mobile||null, pan||null, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/notification-config', auth('admin'), async (req, res) => {
  res.json({
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    whatsappConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
    twilioSid: process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.slice(0,6)+'***' : null,
    appUrl: process.env.APP_URL || null
  });
});

// Send test notification
app.post('/api/admin/test-notification', auth('admin'), async (req, res) => {
  const { type, to_email, to_mobile } = req.body;
  const { sendEmail, sendWhatsApp } = require('./notifications');
  const results = {};
  if (type === 'email' || type === 'both') {
    results.email = await sendEmail({
      to: to_email || req.body.email,
      subject: 'InvestTrack — Test Notification',
      html: '<p>This is a test email from InvestTrack. Your email notifications are working! 🎉</p>',
      text: 'Test notification from InvestTrack'
    });
  }
  if (type === 'whatsapp' || type === 'both') {
    results.whatsapp = await sendWhatsApp(to_mobile || req.body.mobile,
      '🏗 *InvestTrack Test*\n\nYour WhatsApp notifications are working! 🎉\n\nThis is a test message from InvestTrack.'
    );
  }
  res.json({ message: 'Test sent', results });
});

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
const crypto = require('crypto');

// Helper: get a simple device label from user-agent
function deviceLabel(ua = '') {
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile — ' + ua.slice(0, 40);
  if (/windows/i.test(ua)) return 'Windows — ' + ua.slice(0, 40);
  if (/mac/i.test(ua)) return 'Mac — ' + ua.slice(0, 40);
  if (/linux/i.test(ua)) return 'Linux — ' + ua.slice(0, 40);
  return 'Browser — ' + ua.slice(0, 40);
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1 AND is_active=TRUE', [email.toLowerCase()]);
    if (!r.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });

    // Check if device is already trusted
    const deviceToken = req.headers['x-device-token'];
    const requireDevice = process.env.REQUIRE_DEVICE_TRUST !== 'false';

    if (requireDevice && deviceToken) {
      const devR = await pool.query(
        'SELECT id FROM trusted_devices WHERE device_token=$1 AND user_id=$2 AND is_active=TRUE',
        [deviceToken, user.id]
      );
      if (devR.rows.length) {
        // Known trusted device — log in directly
        pool.query('UPDATE trusted_devices SET last_seen=NOW() WHERE device_token=$1', [deviceToken]).catch(() => {});
        return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.full_name }, device_trusted: true });
      }
    }

    if (requireDevice) {
      // Check if any delivery channel is configured on this server
      const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
      const waConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
      const canDeliver = (emailConfigured && user.email) || (waConfigured && user.mobile);

      if (!canDeliver) {
        // No delivery channel configured — auto-trust this device and warn in logs
        console.warn(`⚠️  [DEVICE TRUST] No OTP delivery channel configured. Auto-trusting device for user: ${user.email}. Configure EMAIL_USER/EMAIL_PASS or Twilio env vars to enforce OTP.`);
        const deviceTokenAuto = crypto.randomBytes(48).toString('hex');
        const ua = req.headers['user-agent'] || '';
        await pool.query(
          'INSERT INTO trusted_devices (user_id, device_token, device_label) VALUES ($1,$2,$3)',
          [user.id, deviceTokenAuto, deviceLabel(ua)]
        );
        return res.json({
          token,
          device_token: deviceTokenAuto,
          user: { id: user.id, email: user.email, role: user.role, name: user.full_name },
          device_trusted: true,
          warning: 'Device auto-trusted: no OTP delivery channel configured. Set up email or WhatsApp in Settings.'
        });
      }

      // Delivery channel exists — generate and send OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.query('DELETE FROM device_otps WHERE user_id=$1', [user.id]);
      await pool.query(
        'INSERT INTO device_otps (user_id, otp_code, expires_at) VALUES ($1,$2,NOW()+INTERVAL \'10 minutes\')',
        [user.id, otp]
      );

      // Always log to server console as fallback (visible in Railway logs)
      console.log(`🔐 [OTP] User: ${user.email} | Code: ${otp} | Expires: 10 min`);

      const { sendEmail, sendWhatsApp } = require('./notifications');
      const otpMsg = `Your InvestTrack device verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
      let deliveryNote = '';

      if (emailConfigured && user.email) {
        try {
          await sendEmail({ to: user.email, subject: 'InvestTrack — Device Verification Code',
            html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2 style="color:#0F1E3D">Device Verification</h2><p>Someone is trying to log in to InvestTrack from a new device.</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#F8FAFC;border-radius:8px;color:#0F1E3D">${otp}</div><p style="color:#666;font-size:13px">This code expires in 10 minutes. If this wasn't you, your password may be compromised.</p></div>`,
            text: otpMsg
          });
          deliveryNote = `OTP sent to ${user.email}`;
        } catch(e) {
          console.error('OTP email error:', e.message);
          deliveryNote = 'Email delivery failed. Check Railway logs for OTP code.';
        }
      }

      if (waConfigured && user.mobile) {
        sendWhatsApp(user.mobile, otpMsg).catch(e => console.error('OTP WA error:', e.message));
        if (!deliveryNote) deliveryNote = `OTP sent to ${user.mobile}`;
      }

      const tempToken = jwt.sign({ id: user.id, otp_step: true }, JWT_SECRET, { expiresIn: '15m' });
      return res.status(202).json({ otp_required: true, temp_token: tempToken, message: deliveryNote || 'OTP sent.' });
    }

    // Device trust not required (REQUIRE_DEVICE_TRUST=false)
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.full_name }, device_trusted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Verify OTP and register device ──
app.post('/api/auth/verify-device', async (req, res) => {
  const { otp_code } = req.body;
  const tempToken = req.headers.authorization?.slice(7);
  if (!tempToken || !otp_code) return res.status(400).json({ error: 'OTP and temp token required' });
  try {
    let payload;
    try { payload = jwt.verify(tempToken, JWT_SECRET); }
    catch { return res.status(401).json({ error: 'Session expired. Please log in again.' }); }
    if (!payload.otp_step) return res.status(400).json({ error: 'Invalid token type' });

    const otpR = await pool.query(
      'SELECT * FROM device_otps WHERE user_id=$1 AND otp_code=$2 AND used=FALSE AND expires_at > NOW()',
      [payload.id, otp_code.toString().trim()]
    );
    if (!otpR.rows.length) return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });

    // Mark OTP as used
    await pool.query('UPDATE device_otps SET used=TRUE WHERE id=$1', [otpR.rows[0].id]);

    // Issue a device token and store it
    const deviceToken = crypto.randomBytes(48).toString('hex');
    const ua = req.headers['user-agent'] || '';
    await pool.query(
      'INSERT INTO trusted_devices (user_id, device_token, device_label) VALUES ($1,$2,$3)',
      [payload.id, deviceToken, deviceLabel(ua)]
    );

    // Issue full JWT
    const userR = await pool.query('SELECT id,email,role,full_name FROM users WHERE id=$1', [payload.id]);
    const user = userR.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, device_token: deviceToken, user: { id: user.id, email: user.email, role: user.role, name: user.full_name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── List trusted devices (user sees their own, admin can see all) ──
app.get('/api/auth/devices', auth(), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id,device_label,last_seen,created_at,is_active FROM trusted_devices WHERE user_id=$1 ORDER BY last_seen DESC',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Revoke a specific device ──
app.delete('/api/auth/devices/:id', auth(), async (req, res) => {
  try {
    await pool.query(
      'UPDATE trusted_devices SET is_active=FALSE WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Device revoked' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: revoke any device ──
app.delete('/api/admin/devices/:id', auth('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE trusted_devices SET is_active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Device revoked' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: list all devices for a user ──
app.get('/api/admin/users/:id/devices', auth('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id,device_label,last_seen,created_at,is_active FROM trusted_devices WHERE user_id=$1 ORDER BY last_seen DESC',
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth(), async (req, res) => {
  try {
    const r = await pool.query('SELECT id,email,role,full_name,mobile,pan,address FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/auth/password', auth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// USERS (admin)
// ══════════════════════════════════════════
app.get('/api/users', auth('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT id,email,role,full_name,mobile,pan,is_active,created_at FROM users ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', auth('admin'), async (req, res) => {
  const { email, password, role, full_name, mobile, pan, aadhaar, address } = req.body;
  if (!email || !password || !role || !full_name) return res.status(400).json({ error: 'Required fields missing' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users (email,password_hash,role,full_name,mobile,pan,aadhaar,address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,email,role,full_name,mobile',
      [email.toLowerCase(), hash, role, full_name, mobile||null, pan||null, aadhaar||null, address||null]
    );
    const newUser = r.rows[0];
    // Send welcome notification for investors
    if (role === 'investor' && req.body._notify !== false) {
      setImmediate(() => notify('welcomeInvestor', {
        name: full_name,
        email: email.toLowerCase(),
        password: password,
        projectName: req.body._projectName || 'your investment project'
      }, [{ email: email.toLowerCase(), mobile: mobile||null, name: full_name }]));
    }
    res.json(newUser);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', auth('admin'), async (req, res) => {
  const { full_name, mobile, pan, aadhaar, address, is_active, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.params.id]);
    }
    await pool.query(
      'UPDATE users SET full_name=$1,mobile=$2,pan=$3,aadhaar=$4,address=$5,is_active=$6,updated_at=NOW() WHERE id=$7',
      [full_name, mobile||null, pan||null, aadhaar||null, address||null, is_active!==undefined?is_active:true, req.params.id]
    );
    res.json({ message: 'User updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════
app.get('/api/projects', auth(), async (req, res) => {
  try {
    let q, params = [];
    if (req.user.role === 'admin') {
      q = `SELECT p.*, 
        (SELECT COUNT(*) FROM investments i WHERE i.project_id=p.id) as investor_count,
        (SELECT COALESCE(SUM(amount),0) FROM investments i WHERE i.project_id=p.id) as total_capital,
        (SELECT COALESCE(SUM(amount),0) FROM transactions t WHERE t.project_id=p.id AND t.type='expense') as total_expense,
        (SELECT COALESCE(SUM(sale_amount),0) FROM site_sales ss WHERE ss.project_id=p.id) as total_sales
        FROM projects p ORDER BY p.created_at DESC`;
    } else {
      q = `SELECT p.id,p.name,p.code,p.location,p.status,p.start_date,p.end_date,p.description,
        i.investor_code,i.amount,i.investment_date,i.kyc_status,
        (SELECT COALESCE(SUM(amount),0) FROM investments WHERE project_id=p.id) as total_capital
        FROM projects p 
        JOIN investments i ON i.project_id=p.id AND i.user_id=$1
        ORDER BY p.created_at DESC`;
      params = [req.user.id];
    }
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:id', auth(), async (req, res) => {
  try {
    const pid = req.params.id;
    if (req.user.role !== 'admin') {
      const access = await pool.query('SELECT id FROM investments WHERE project_id=$1 AND user_id=$2', [pid, req.user.id]);
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }
    const r = await pool.query('SELECT * FROM projects WHERE id=$1', [pid]);
    if (!r.rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects', auth('admin'), async (req, res) => {
  const { name, code, location, survey_details, aop_pan, target_capital, wg_partners, start_date, end_date, bank_account, bank_name, ifsc, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO projects (name,code,location,survey_details,aop_pan,target_capital,wg_partners,start_date,end_date,bank_account,bank_name,ifsc,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, code||null, location||null, survey_details||null, aop_pan||null, target_capital||0, wg_partners||null, start_date||null, end_date||null, bank_account||null, bank_name||null, ifsc||null, description||null]
    );
    const project = r.rows[0];
    // Insert default milestones
    for (let i = 0; i < defaultMilestones.length; i++) {
      await client.query(
        'INSERT INTO milestones (project_id,title,order_index) VALUES ($1,$2,$3)',
        [project.id, defaultMilestones[i], i]
      );
    }
    await client.query('COMMIT');
    res.json(project);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(400).json({ error: 'Project code already exists' });
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

app.put('/api/projects/:id', auth('admin'), async (req, res) => {
  const { name, code, location, survey_details, aop_pan, target_capital, wg_partners, start_date, end_date, bank_account, bank_name, ifsc, description, status } = req.body;
  try {
    await pool.query(
      `UPDATE projects SET name=$1,code=$2,location=$3,survey_details=$4,aop_pan=$5,target_capital=$6,
       wg_partners=$7,start_date=$8,end_date=$9,bank_account=$10,bank_name=$11,ifsc=$12,description=$13,status=$14,updated_at=NOW() WHERE id=$15`,
      [name, code||null, location||null, survey_details||null, aop_pan||null, target_capital||0, wg_partners||null, start_date||null, end_date||null, bank_account||null, bank_name||null, ifsc||null, description||null, status||'active', req.params.id]
    );
    res.json({ message: 'Project updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// MILESTONES
// ══════════════════════════════════════════
app.get('/api/projects/:id/milestones', auth(), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM milestones WHERE project_id=$1 ORDER BY order_index', [req.params.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/milestones/:id', auth('admin'), async (req, res) => {
  const { status, milestone_date, notes } = req.body;
  try {
    const old = await pool.query('SELECT * FROM milestones WHERE id=$1', [req.params.id]);
    await pool.query(
      'UPDATE milestones SET status=$1,milestone_date=$2,notes=$3,updated_at=NOW() WHERE id=$4',
      [status, milestone_date||null, notes||null, req.params.id]
    );
    // Notify investors when milestone status changes
    if (old.rows.length && old.rows[0].status !== status) {
      setImmediate(async () => {
        try {
          const ms = old.rows[0];
          const projR = await pool.query('SELECT name FROM projects WHERE id=$1', [ms.project_id]);
          const invR = await pool.query(
            'SELECT u.email,u.mobile,u.full_name FROM investments i JOIN users u ON u.id=i.user_id WHERE i.project_id=$1 AND i.user_id IS NOT NULL',
            [ms.project_id]
          );
          if (invR.rows.length) {
            await notify('milestoneUpdate', {
              projectName: projR.rows[0]?.name || 'Project',
              milestoneName: ms.title, status, notes
            }, invR.rows.map(r => ({ email: r.email, mobile: r.mobile, name: r.full_name })));
          }
        } catch(e) { console.error('Notify milestone error:', e.message); }
      });
    }
    res.json({ message: 'Milestone updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// INVESTMENTS
// ══════════════════════════════════════════
app.get('/api/projects/:id/investments', auth(), async (req, res) => {
  try {
    const pid = req.params.id;
    let q;
    if (req.user.role === 'admin') {
      q = `SELECT i.*,u.email as user_email,u.full_name as user_full_name,
           ROUND(i.amount::numeric / NULLIF((SELECT SUM(amount) FROM investments WHERE project_id=i.project_id),0)*100,4) as pool_share
           FROM investments i LEFT JOIN users u ON u.id=i.user_id
           WHERE i.project_id=$1 ORDER BY i.created_at DESC`;
    } else {
      q = `SELECT i.*,
           ROUND(i.amount::numeric / NULLIF((SELECT SUM(amount) FROM investments WHERE project_id=i.project_id),0)*100,4) as pool_share
           FROM investments i WHERE i.project_id=$1 AND i.user_id=$2`;
    }
    const r = await pool.query(q, req.user.role === 'admin' ? [pid] : [pid, req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/investments/mine', auth(), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT i.*,p.name as project_name,p.location,p.status as project_status,p.code as project_code,
       ROUND(i.amount::numeric / NULLIF((SELECT SUM(amount) FROM investments WHERE project_id=i.project_id),0)*100,4) as pool_share
       FROM investments i JOIN projects p ON p.id=i.project_id
       WHERE i.user_id=$1 ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects/:id/investments', auth('admin'), async (req, res) => {
  const { user_id, amount, utr_reference, investment_date, kyc_status, parent_name, pan, aadhaar, mobile, email, address, bank_acc, bank_name, ifsc, notes, full_name } = req.body;
  try {
    const pid = req.params.id;
    const year = new Date().getFullYear();
    const countR = await pool.query('SELECT COUNT(*) FROM investments WHERE project_id=$1', [pid]);
    const seq = (parseInt(countR.rows[0].count) + 1).toString().padStart(3, '0');
    const codeR = await pool.query('SELECT code FROM projects WHERE id=$1', [pid]);
    const pcode = (codeR.rows[0]?.code || pid).toUpperCase();
    const investor_code = `${pcode}-${year}-${seq}`;
    const initialAmount = amount ? parseInt(amount) : 0;
    const r = await pool.query(
      `INSERT INTO investments (investor_code,user_id,project_id,amount,utr_reference,investment_date,kyc_status,full_name,parent_name,pan,aadhaar,mobile,email,address,bank_acc,bank_name,ifsc,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [investor_code, user_id||null, pid, initialAmount, utr_reference||null, investment_date||null, kyc_status||'pending', full_name||null, parent_name||null, pan||null, aadhaar||null, mobile||null, email||null, address||null, bank_acc||null, bank_name||null, ifsc||null, notes||null]
    );
    const inv = r.rows[0];
    if (initialAmount > 0) {
      await pool.query(
        'INSERT INTO investor_payments (investment_id,amount,utr_reference,payment_date,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6)',
        [inv.id, initialAmount, utr_reference||null, investment_date||null, null, req.user.id]
      );
      await pool.query(
        'INSERT INTO transactions (project_id,type,category,amount,description,transaction_date,reference,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [pid, 'capital_in', 'Investor Capital', initialAmount, `Capital from ${investor_code}`, investment_date||new Date().toISOString().slice(0,10), utr_reference||null, req.user.id]
      );
    }
    if (user_id && initialAmount > 0) {
      setImmediate(async () => {
        try {
          const userR = await pool.query('SELECT full_name,email,mobile FROM users WHERE id=$1', [user_id]);
          const projR = await pool.query('SELECT name FROM projects WHERE id=$1', [pid]);
          const totalR = await pool.query('SELECT SUM(amount) FROM investments WHERE project_id=$1', [pid]);
          const share = totalR.rows[0].sum > 0 ? (initialAmount / totalR.rows[0].sum * 100).toFixed(2) : '0';
          if (userR.rows.length) {
            await notify('investmentConfirmed', {
              investorCode: investor_code,
              amount: initialAmount, share,
              projectName: projR.rows[0]?.name || 'Project',
              date: investment_date || new Date().toISOString().slice(0,10)
            }, [{ email: userR.rows[0].email, mobile: userR.rows[0].mobile, name: userR.rows[0].full_name }]);
          }
        } catch(e) { console.error('Notify invest error:', e.message); }
      });
    }
    res.json(inv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Investor Payments (multiple payments per investor) ──
app.get('/api/investments/:id/payments', auth('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT p.*,u.full_name as created_by_name FROM investor_payments p LEFT JOIN users u ON u.id=p.created_by WHERE p.investment_id=$1 ORDER BY p.payment_date DESC,p.created_at DESC',
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/investments/:id/payments', auth('admin'), async (req, res) => {
  const { amount, utr_reference, payment_date, notes } = req.body;
  if (!amount || !payment_date) return res.status(400).json({ error: 'Amount and payment date are required' });
  try {
    const invId = req.params.id;
    const invR = await pool.query('SELECT * FROM investments WHERE id=$1', [invId]);
    if (!invR.rows.length) return res.status(404).json({ error: 'Investor not found' });
    const inv = invR.rows[0];
    const pr = await pool.query(
      'INSERT INTO investor_payments (investment_id,amount,utr_reference,payment_date,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [invId, parseInt(amount), utr_reference||null, payment_date, notes||null, req.user.id]
    );
    await pool.query('UPDATE investments SET amount=amount+$1,updated_at=NOW() WHERE id=$2', [parseInt(amount), invId]);
    await pool.query(
      'INSERT INTO transactions (project_id,type,category,amount,description,transaction_date,reference,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [inv.project_id, 'capital_in', 'Investor Capital', parseInt(amount), `Payment from ${inv.investor_code}`, payment_date, utr_reference||null, req.user.id]
    );
    res.json(pr.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/investments/:id/payments/:pid', auth('admin'), async (req, res) => {
  try {
    const pmtR = await pool.query('SELECT * FROM investor_payments WHERE id=$1 AND investment_id=$2', [req.params.pid, req.params.id]);
    if (!pmtR.rows.length) return res.status(404).json({ error: 'Payment not found' });
    const pmt = pmtR.rows[0];
    await pool.query('DELETE FROM investor_payments WHERE id=$1', [req.params.pid]);
    await pool.query('UPDATE investments SET amount=GREATEST(0,amount-$1),updated_at=NOW() WHERE id=$2', [pmt.amount, req.params.id]);
    res.json({ message: 'Payment deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/investments/:id', auth('admin'), async (req, res) => {
  const { kyc_status, full_name, parent_name, pan, aadhaar, mobile, email, address, bank_acc, bank_name, ifsc, notes, agreement_signed } = req.body;
  try {
    await pool.query(
      `UPDATE investments SET kyc_status=$1,full_name=$2,parent_name=$3,pan=$4,aadhaar=$5,mobile=$6,email=$7,address=$8,bank_acc=$9,bank_name=$10,ifsc=$11,notes=$12,agreement_signed=$13,updated_at=NOW() WHERE id=$14`,
      [kyc_status||'pending', full_name||null, parent_name||null, pan||null, aadhaar||null, mobile||null, email||null, address||null, bank_acc||null, bank_name||null, ifsc||null, notes||null, agreement_signed||false, req.params.id]
    );
    res.json({ message: 'Investor updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// TRANSACTIONS / ACCOUNTS
// ══════════════════════════════════════════
app.get('/api/projects/:id/transactions', auth(), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT t.*,u.full_name as created_by_name FROM transactions t LEFT JOIN users u ON u.id=t.created_by WHERE t.project_id=$1 ORDER BY t.transaction_date DESC,t.created_at DESC',
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects/:id/transactions', auth('admin'), async (req, res) => {
  const { type, category, amount, description, transaction_date, reference } = req.body;
  if (!type || !amount || !transaction_date) return res.status(400).json({ error: 'Type, amount, date required' });
  try {
    const r = await pool.query(
      'INSERT INTO transactions (project_id,type,category,amount,description,transaction_date,reference,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.params.id, type, category||null, amount, description||null, transaction_date, reference||null, req.user.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/transactions/:id', auth('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// DOCUMENTS
// ══════════════════════════════════════════
app.get('/api/projects/:id/documents', auth(), async (req, res) => {
  try {
    const pid = req.params.id;
    let q;
    if (req.user.role === 'admin') {
      q = 'SELECT id,project_id,investment_id,doc_type,title,file_name,file_mime,file_size,description,is_public,created_at FROM documents WHERE project_id=$1 ORDER BY created_at DESC';
    } else {
      q = 'SELECT id,project_id,investment_id,doc_type,title,file_name,file_mime,file_size,description,is_public,created_at FROM documents WHERE project_id=$1 AND is_public=TRUE ORDER BY created_at DESC';
    }
    const r = await pool.query(q, [pid]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects/:id/documents', auth('admin'), upload.single('file'), async (req, res) => {
  const { doc_type, title, description, is_public, investment_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'File required' });
  if (!title || !doc_type) return res.status(400).json({ error: 'Title and type required' });
  try {
    const b64 = req.file.buffer.toString('base64');
    const r = await pool.query(
      'INSERT INTO documents (project_id,investment_id,doc_type,title,file_name,file_mime,file_data,file_size,description,is_public,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,title,doc_type,file_name,created_at',
      [req.params.id, investment_id||null, doc_type, title, req.file.originalname, req.file.mimetype, b64, req.file.size, description||null, is_public==='true'||is_public===true, req.user.id]
    );
    const doc = r.rows[0];
    // Notify investors if document is public
    if (is_public === 'true' || is_public === true) {
      setImmediate(async () => {
        try {
          const invR = await pool.query(
            'SELECT u.email,u.mobile,u.full_name FROM investments i JOIN users u ON u.id=i.user_id WHERE i.project_id=$1 AND i.user_id IS NOT NULL',
            [req.params.id]
          );
          const projR = await pool.query('SELECT name FROM projects WHERE id=$1', [req.params.id]);
          if (invR.rows.length) {
            await notify('documentShared', {
              projectName: projR.rows[0]?.name || 'Project',
              docTitle: title, docType: doc_type
            }, invR.rows.map(r => ({ email: r.email, mobile: r.mobile, name: r.full_name })));
          }
        } catch(e) { console.error('Notify doc error:', e.message); }
      });
    }
    res.json(doc);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/documents/:id/download', auth(), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Document not found' });
    const doc = r.rows[0];
    if (req.user.role !== 'admin' && !doc.is_public) {
      const access = await pool.query('SELECT id FROM investments WHERE project_id=$1 AND user_id=$2', [doc.project_id, req.user.id]);
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }
    const buf = Buffer.from(doc.file_data, 'base64');
    res.set('Content-Type', doc.file_mime);
    res.set('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/documents/:id', auth('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM documents WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// STAGE UPDATES (Project Progress + Photos)
// ══════════════════════════════════════════
app.get('/api/projects/:id/stages', auth(), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT s.*,u.full_name as created_by_name,
       COALESCE(json_agg(json_build_object('id',sp.id,'caption',sp.caption,'file_name',sp.file_name,'file_mime',sp.file_mime,'created_at',sp.created_at)) FILTER (WHERE sp.id IS NOT NULL),'[]') as photos
       FROM stage_updates s LEFT JOIN users u ON u.id=s.created_by LEFT JOIN stage_photos sp ON sp.stage_id=s.id
       WHERE s.project_id=$1 GROUP BY s.id,u.full_name ORDER BY s.stage_date DESC,s.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects/:id/stages', auth('admin'), upload.array('photos', 10), async (req, res) => {
  const { title, description, stage_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      'INSERT INTO stage_updates (project_id,title,description,stage_date,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, title, description||null, stage_date||null, req.user.id]
    );
    const stage = r.rows[0];
    if (req.files && req.files.length) {
      const captions = req.body.captions ? (Array.isArray(req.body.captions) ? req.body.captions : [req.body.captions]) : [];
      for (let i = 0; i < req.files.length; i++) {
        const f = req.files[i];
        const b64 = f.buffer.toString('base64');
        await client.query(
          'INSERT INTO stage_photos (stage_id,file_name,file_mime,file_data,caption) VALUES ($1,$2,$3,$4,$5)',
          [stage.id, f.originalname, f.mimetype, b64, captions[i]||null]
        );
      }
    }
    await client.query('COMMIT');
    // Notify all investors
    setImmediate(async () => {
      try {
        const invR = await pool.query(
          'SELECT u.email,u.mobile,u.full_name FROM investments i JOIN users u ON u.id=i.user_id WHERE i.project_id=$1 AND i.user_id IS NOT NULL',
          [req.params.id]
        );
        const projR = await pool.query('SELECT name FROM projects WHERE id=$1', [req.params.id]);
        if (invR.rows.length) {
          await notify('stageUpdate', {
            projectName: projR.rows[0]?.name || 'Project',
            title, description
          }, invR.rows.map(r => ({ email: r.email, mobile: r.mobile, name: r.full_name })));
        }
      } catch(e) { console.error('Notify stage error:', e.message); }
    });
    res.json(stage);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

app.get('/api/stage-photos/:id', auth(), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM stage_photos WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const p = r.rows[0];
    const buf = Buffer.from(p.file_data, 'base64');
    res.set('Content-Type', p.file_mime);
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/stages/:id', auth('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM stage_updates WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// SITE SALES
// ══════════════════════════════════════════
app.get('/api/projects/:id/sales', auth(), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ss.*,u.full_name as created_by_name,
       COALESCE(json_agg(json_build_object('id',sd.id,'doc_type',sd.doc_type,'title',sd.title,'file_name',sd.file_name,'created_at',sd.created_at)) FILTER (WHERE sd.id IS NOT NULL),'[]') as documents
       FROM site_sales ss LEFT JOIN users u ON u.id=ss.created_by LEFT JOIN site_sale_documents sd ON sd.sale_id=ss.id
       WHERE ss.project_id=$1 GROUP BY ss.id,u.full_name ORDER BY ss.sale_date DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects/:id/sales', auth('admin'), upload.array('documents', 5), async (req, res) => {
  const { plot_number, plot_area, customer_name, customer_pan, customer_mobile, customer_address, sale_amount, sale_date, registration_date, doc_number, notes } = req.body;
  if (!customer_name || !sale_amount) return res.status(400).json({ error: 'Customer name and amount required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO site_sales (project_id,plot_number,plot_area,customer_name,customer_pan,customer_mobile,customer_address,sale_amount,sale_date,registration_date,doc_number,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.params.id, plot_number||null, plot_area||null, customer_name, customer_pan||null, customer_mobile||null, customer_address||null, sale_amount, sale_date||null, registration_date||null, doc_number||null, notes||null, req.user.id]
    );
    const sale = r.rows[0];
    // Record as income transaction
    await client.query(
      'INSERT INTO transactions (project_id,type,category,amount,description,transaction_date,reference,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [req.params.id, 'income', 'Site Sale', sale_amount, `Plot ${plot_number||'?'} — ${customer_name}`, sale_date||new Date().toISOString().slice(0,10), doc_number||null, req.user.id]
    );
    if (req.files && req.files.length) {
      const docTypes = req.body.doc_types ? (Array.isArray(req.body.doc_types) ? req.body.doc_types : [req.body.doc_types]) : [];
      const docTitles = req.body.doc_titles ? (Array.isArray(req.body.doc_titles) ? req.body.doc_titles : [req.body.doc_titles]) : [];
      for (let i = 0; i < req.files.length; i++) {
        const f = req.files[i];
        const b64 = f.buffer.toString('base64');
        await client.query(
          'INSERT INTO site_sale_documents (sale_id,doc_type,title,file_name,file_mime,file_data) VALUES ($1,$2,$3,$4,$5,$6)',
          [sale.id, docTypes[i]||'sale_deed', docTitles[i]||f.originalname, f.originalname, f.mimetype, b64]
        );
      }
    }
    await client.query('COMMIT');
    res.json(sale);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

app.get('/api/sale-documents/:id/download', auth('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM site_sale_documents WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const d = r.rows[0];
    const buf = Buffer.from(d.file_data, 'base64');
    res.set('Content-Type', d.file_mime);
    res.set('Content-Disposition', `attachment; filename="${d.file_name}"`);
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════
app.get('/api/projects/:id/report', auth(), async (req, res) => {
  try {
    const pid = req.params.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const access = await pool.query('SELECT id FROM investments WHERE project_id=$1 AND user_id=$2', [pid, req.user.id]);
      if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });
    }

    const [project, milestones, investments, transactions, stages, sales] = await Promise.all([
      pool.query('SELECT * FROM projects WHERE id=$1', [pid]),
      pool.query('SELECT * FROM milestones WHERE project_id=$1 ORDER BY order_index', [pid]),
      pool.query(`SELECT i.*,u.full_name as user_name,ROUND(i.amount::numeric/NULLIF((SELECT SUM(amount) FROM investments WHERE project_id=$1),0)*100,4) as pool_share FROM investments i LEFT JOIN users u ON u.id=i.user_id WHERE i.project_id=$1 ORDER BY i.amount DESC`, [pid]),
      isAdmin ? pool.query('SELECT * FROM transactions WHERE project_id=$1 ORDER BY transaction_date DESC', [pid]) : pool.query("SELECT id,type,category,amount,description,transaction_date,reference FROM transactions WHERE project_id=$1 AND type IN ('capital_in','income') ORDER BY transaction_date DESC", [pid]),
      pool.query('SELECT id,title,description,stage_date,created_at FROM stage_updates WHERE project_id=$1 ORDER BY stage_date DESC', [pid]),
      isAdmin ? pool.query('SELECT * FROM site_sales WHERE project_id=$1 ORDER BY sale_date DESC', [pid]) : pool.query("SELECT plot_number,plot_area,sale_amount,sale_date FROM site_sales WHERE project_id=$1 ORDER BY sale_date DESC", [pid])
    ]);

    const p = project.rows[0];
    const invs = investments.rows;
    const txns = transactions.rows;
    const totalCapital = invs.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = sales.rows.reduce((s, r) => s + Number(r.sale_amount), 0);
    const netProfit = totalIncome - totalCapital - totalExpense;
    const invPoolShare = Math.max(0, netProfit * 0.5);
    const wgShare = Math.max(0, netProfit * 0.5);

    res.json({
      project: p,
      summary: {
        totalInvestors: invs.length,
        totalCapital,
        totalExpense,
        totalIncome,
        netProfit,
        invPoolShare,
        wgShare,
        targetCapital: p.target_capital,
        capitalPct: p.target_capital > 0 ? ((totalCapital / p.target_capital) * 100).toFixed(2) : '0',
        plotsSold: sales.rows.length
      },
      milestones: milestones.rows,
      investments: invs,
      transactions: txns,
      stages: stages.rows,
      sales: sales.rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin overall report
app.get('/api/reports/overview', auth('admin'), async (req, res) => {
  try {
    const [projects, users, investments, transactions, sales] = await Promise.all([
      pool.query('SELECT id,name,code,status,target_capital FROM projects'),
      pool.query("SELECT role,COUNT(*) as count FROM users GROUP BY role"),
      pool.query('SELECT project_id,SUM(amount) as total,COUNT(*) as count FROM investments GROUP BY project_id'),
      pool.query("SELECT project_id,type,SUM(amount) as total FROM transactions GROUP BY project_id,type"),
      pool.query('SELECT project_id,COUNT(*) as count,SUM(sale_amount) as total FROM site_sales GROUP BY project_id')
    ]);
    res.json({ projects: projects.rows, userCounts: users.rows, investments: investments.rows, transactions: transactions.rows, sales: sales.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// CATCH ALL → SPA
// ══════════════════════════════════════════
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ══════════════════════════════════════════
// START
// ══════════════════════════════════════════
// Test DB connection first
pool.query('SELECT 1').then(() => {
  console.log('✅ Database connected successfully');
  return initDB();
}).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ InvestTrack running on port ${PORT}`);
  });
}).catch(e => {
  console.error('❌ Startup failed:', e.message);
  console.error('DATABASE_URL configured:', !!process.env.DATABASE_URL);
  process.exit(1);
});
