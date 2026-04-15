const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const initSQL = `
-- Users (admin + investors)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','investor')),
  full_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  pan VARCHAR(20),
  aadhaar VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  location TEXT,
  survey_details TEXT,
  aop_pan VARCHAR(20),
  target_capital BIGINT DEFAULT 0,
  wg_partners TEXT,
  start_date DATE,
  end_date DATE,
  bank_account TEXT,
  bank_name VARCHAR(255),
  ifsc VARCHAR(20),
  status VARCHAR(50) DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  milestone_date DATE,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Investments (investor ↔ project)
CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  investor_code VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  utr_reference VARCHAR(255),
  investment_date DATE,
  kyc_status VARCHAR(20) DEFAULT 'pending',
  parent_name VARCHAR(255),
  pan VARCHAR(20),
  aadhaar VARCHAR(20),
  mobile VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  bank_acc VARCHAR(100),
  bank_name VARCHAR(255),
  ifsc VARCHAR(20),
  notes TEXT,
  agreement_signed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions / Accounts
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  amount BIGINT NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  reference VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  investment_id INTEGER REFERENCES investments(id) ON DELETE SET NULL,
  doc_type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255),
  file_mime VARCHAR(100),
  file_data TEXT,
  file_size INTEGER,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stage Updates (project progress with photos)
CREATE TABLE IF NOT EXISTS stage_updates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stage_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stage Photos
CREATE TABLE IF NOT EXISTS stage_photos (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER REFERENCES stage_updates(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_mime VARCHAR(100),
  file_data TEXT,
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Site Sales (plots sold to customers)
CREATE TABLE IF NOT EXISTS site_sales (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  plot_number VARCHAR(50),
  plot_area VARCHAR(100),
  customer_name VARCHAR(255) NOT NULL,
  customer_pan VARCHAR(20),
  customer_mobile VARCHAR(20),
  customer_address TEXT,
  sale_amount BIGINT NOT NULL,
  sale_date DATE,
  registration_date DATE,
  doc_number VARCHAR(100),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Site Sale Documents
CREATE TABLE IF NOT EXISTS site_sale_documents (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES site_sales(id) ON DELETE CASCADE,
  doc_type VARCHAR(80),
  title VARCHAR(255),
  file_name VARCHAR(255),
  file_mime VARCHAR(100),
  file_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
-- Add full_name to investments if not exists (safe for existing DBs)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investments' AND column_name='full_name') THEN
    ALTER TABLE investments ADD COLUMN full_name VARCHAR(255);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_investments_project ON investments(project_id);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_stage_updates_project ON stage_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_site_sales_project ON site_sales(project_id);
`;

const defaultMilestones = [
  'Capital Collection',
  'Land Identification & Due Diligence',
  'Land Purchase / Sale Agreement',
  'Land Registration & Acquisition',
  'Government Approvals & Plan Sanction',
  'Layout Development — Phase 1',
  'Layout Development — Phase 2',
  'Infrastructure (Roads, Drainage, Electricity)',
  'Marketing & Sales Launch',
  'Site Sales to Customers',
  'Project Completion & Accounts Closure',
  'Capital & Profit Distribution to Investors'
];

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(initSQL);
    console.log('✅ Database schema initialized');

    // Create default admin if not exists
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@investtrack.in';
    const existing = await client.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 10);
      await client.query(
        'INSERT INTO users (email, password_hash, role, full_name) VALUES ($1,$2,$3,$4)',
        [adminEmail, hash, 'admin', process.env.ADMIN_NAME || 'Administrator']
      );
      console.log(`✅ Default admin created: ${adminEmail}`);
    }
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB, defaultMilestones };
