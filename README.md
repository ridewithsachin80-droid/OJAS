# InvestTrack — AOP Real Estate Investment Platform

Full-stack multi-project investment management system with investor & admin portals.

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Railway)
- **Auth**: JWT (7-day tokens)
- **File Storage**: PostgreSQL (base64, max 20MB/file)
- **Frontend**: Single Page App (vanilla JS, served by Express)

---

## 🚀 Deploy to Railway (Step by Step)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/investtrack.git
git push -u origin main
```

### Step 2 — Create Railway Project
1. Go to [railway.app](https://railway.app) and log in
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Connect your GitHub and select this repo

### Step 3 — Add PostgreSQL Database
1. In your Railway project, click **+ New**
2. Select **Database → Add PostgreSQL**
3. Railway automatically creates `DATABASE_URL` and injects it

### Step 4 — Set Environment Variables
In Railway → your app service → **Variables**, add:
```
JWT_SECRET=your_random_secret_min_32_chars_change_this
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=YourSecurePassword123
ADMIN_NAME=Administrator
NODE_ENV=production
```

### Step 5 — Deploy
Railway auto-deploys on push. Watch the build logs.
The app will be live at your Railway URL (e.g. `investtrack.up.railway.app`).

---

## 📱 First Login

Use the credentials you set in environment variables:
- **Email**: `admin@yourcompany.com` (your ADMIN_EMAIL)  
- **Password**: `YourSecurePassword123` (your ADMIN_PASSWORD)

---

## 🔑 Workflow

### Admin Flow
1. **Settings → User Management** — Create investor user accounts (email + password)
2. **New Project** — Create a project with all details
3. **Project → Investors** — Add investor records and link to their user account
4. **Project → Milestones** — Update project stage progress
5. **Project → Documents** — Upload sale deed, approved plans, etc.
6. **Project → Stage Updates** — Post progress photos
7. **Project → Site Sales** — Record each plot sale with documents
8. **Project → Accounts** — Track all income/expenses
9. **Project → Report** — Full financial report

### Investor Flow
1. Login with credentials given by admin
2. See **My Investments** — all projects they're part of
3. Click project → View **Overview, Certificate, Status, Photos, Documents, Report**

---

## 📂 File Structure
```
investtrack-app/
├── server.js          # All backend routes (Express + PostgreSQL)
├── db.js             # Database schema + init
├── middleware/
│   └── auth.js       # JWT authentication middleware
├── public/
│   └── index.html    # Complete SPA frontend
├── package.json
├── railway.toml
└── .env.example
```

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `users` | Admin and investor accounts |
| `projects` | AOP real estate projects |
| `milestones` | Project stage milestones (12 default per project) |
| `investments` | Investor-project investment records |
| `transactions` | Income, expenses, capital, distributions |
| `documents` | Uploaded files (sale deeds, plans, agreements) |
| `stage_updates` | Project progress posts |
| `stage_photos` | Photos for each stage update |
| `site_sales` | Individual plot sales to customers |
| `site_sale_documents` | Documents for each site sale |

---

## 📄 Document Types Supported
- Sale Deed (land purchase)
- Sale Agreement
- Approved Layout Plan
- Government Approval
- Investor Agreement
- Investor Certificate
- Legal Document
- Financial Report
- Stage Photos (unlimited per update)
- Customer Sale Deeds

---

## 💰 Profit Formula
```
Net Profit = Total Sales − Capital − Expenses − Tax

Investor Pool = 50% of Net Profit
Working Group = 50% of Net Profit

Per Investor Share = (Their Capital / Total Capital) × Investor Pool
```

---

## 🔒 Security Notes
- Change `JWT_SECRET` to a strong random string in production
- Change default admin password immediately after first login
- All passwords are bcrypt hashed (cost factor 10)
- Investors can only view their own data and public documents
- All file downloads require authentication
- Investor accounts cannot access other investors' data

---

## Local Development
```bash
# 1. Install dependencies
npm install

# 2. Set up local PostgreSQL and copy env
cp .env.example .env
# Edit .env with your local DB credentials

# 3. Run
npm run dev
# Open http://localhost:3000
```

---

## ⚠️ Legal Note
This platform is a management tool. Ensure all investment agreements, certificates, and documentation are reviewed by a qualified CA and lawyer before use. The platform generates reference documents — legal enforceability depends on physical execution and applicable laws.
