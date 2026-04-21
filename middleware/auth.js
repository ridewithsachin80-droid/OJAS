const jwt = require('jsonwebtoken');
const { pool } = require('../db');

function auth(requiredRole) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const deviceToken = req.headers['x-device-token'];

    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);

      // 1. Check user is still active
      const userR = await pool.query('SELECT is_active FROM users WHERE id=$1', [payload.id]);
      if (!userR.rows.length || !userR.rows[0].is_active)
        return res.status(401).json({ error: 'Account disabled' });

      // 2. Check device is trusted (investors always need device check; admin optional via env)
      const requireDevice = process.env.REQUIRE_DEVICE_TRUST !== 'false';
      if (requireDevice) {
        if (!deviceToken)
          return res.status(403).json({ error: 'untrusted_device', message: 'Device not registered. Please verify via OTP.' });

        const devR = await pool.query(
          'SELECT id FROM trusted_devices WHERE device_token=$1 AND user_id=$2 AND is_active=TRUE',
          [deviceToken, payload.id]
        );
        if (!devR.rows.length)
          return res.status(403).json({ error: 'untrusted_device', message: 'Device not recognised. Please log in again to register it.' });

        // Update last_seen without blocking
        pool.query('UPDATE trusted_devices SET last_seen=NOW() WHERE device_token=$1', [deviceToken]).catch(() => {});
      }

      req.user = payload;
      if (requiredRole && payload.role !== requiredRole && payload.role !== 'admin')
        return res.status(403).json({ error: 'Insufficient permissions' });
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = { auth };
