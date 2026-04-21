# 🕯️ Shuddhi Educational Charitable Trust — Project Management System

A full-stack web application for managing and showcasing the trust's projects, built with **Node.js + Express + PostgreSQL** on the backend and **React + Vite** on the frontend.

---

## 📁 Project Structure

```
shuddhi-trust/
├── server/
│   ├── index.js              ← Express server entry point
│   ├── db.js                 ← PostgreSQL connection + schema init
│   ├── seed.js               ← Seed database with all 16 projects
│   ├── middleware/
│   │   └── auth.js           ← JWT auth middleware
│   └── routes/
│       ├── auth.js           ← POST /api/auth/login
│       └── projects.js       ← Full CRUD for projects + photos
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            ← Root app with hash-based routing
│       ├── api.js             ← All API calls in one place
│       └── components/
│           ├── ProjectsList.jsx
│           ├── ProjectDetail.jsx
│           ├── Lightbox.jsx
│           ├── AdminLogin.jsx
│           ├── AdminDashboard.jsx
│           └── ProjectEditorModal.jsx
├── package.json              ← Root package (server deps + build scripts)
├── railway.json              ← Railway deployment config
├── .env.example              ← Copy to .env for local dev
└── .gitignore
```

---

## 🚀 Deploying to Railway (Step-by-Step)

### Step 1 — Push code to GitHub

```bash
# In your terminal
git init
git add .
git commit -m "Initial commit — Shuddhi Trust project manager"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/shuddhi-trust.git
git branch -M main
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to **[railway.app](https://railway.app)** → Sign up / Log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select **`shuddhi-trust`**
5. Railway will auto-detect `railway.json` and start building

### Step 3 — Add PostgreSQL database

1. In your Railway project dashboard, click **"+ New Service"**
2. Select **"Database" → "PostgreSQL"**
3. Railway creates the database and sets `DATABASE_URL` automatically
   - ✅ No manual config needed — Railway links it to your app

### Step 4 — Set environment variables

In Railway dashboard → your app service → **"Variables"** tab, add:

| Variable          | Value                                      |
|-------------------|--------------------------------------------|
| `JWT_SECRET`      | Any long random string (min 32 chars)      |
| `ADMIN_PASSWORD`  | Your chosen admin password                 |
| `NODE_ENV`        | `production`                               |

> `DATABASE_URL` and `PORT` are set automatically by Railway — do NOT add them manually.

### Step 5 — Seed the database

After the first deploy succeeds, open the Railway shell:

1. In your app service → **"Settings"** → scroll to **"Shell"**
2. Run:
   ```bash
   node server/seed.js
   ```
3. This inserts all 16 projects and their photos into PostgreSQL

### Step 6 — Get your live URL

Railway assigns a URL like `https://shuddhi-trust-production.up.railway.app`

You can add a **custom domain** in Settings → Networking → Custom Domain.

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or use a free [Railway dev DB](https://railway.app))

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/shuddhi-trust.git
cd shuddhi-trust

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Set up environment
cp .env.example .env
# Edit .env with your local DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD

# 4. Seed the database
npm run seed

# 5. Start development servers (backend + frontend simultaneously)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

---

## 🔌 API Reference

All admin endpoints require `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| POST   | `/api/auth/login`  | Login → returns JWT token |
| GET    | `/api/auth/verify` | Check if token is valid  |

### Projects (Public)
| Method | Endpoint             | Description                       |
|--------|----------------------|-----------------------------------|
| GET    | `/api/projects`      | List all projects with photos     |
| GET    | `/api/projects/:id`  | Get single project with photos    |

### Projects (Admin)
| Method | Endpoint             | Description           |
|--------|----------------------|-----------------------|
| POST   | `/api/projects`      | Create project        |
| PUT    | `/api/projects/:id`  | Update project        |
| DELETE | `/api/projects/:id`  | Delete project        |

### Photos (Admin)
| Method | Endpoint                              | Description          |
|--------|---------------------------------------|----------------------|
| POST   | `/api/projects/:id/photos`            | Add photo            |
| DELETE | `/api/projects/:id/photos/:photoId`   | Delete photo         |
| PATCH  | `/api/projects/:id/photos/:photoId`   | Update caption       |

### Health
| Method | Endpoint        | Description            |
|--------|-----------------|------------------------|
| GET    | `/api/health`   | Server health check    |

---

## 🖼️ Adding Photos (Google Photos)

1. Open your Google Photos album
2. Click on any photo to open it
3. Right-click the photo image → **"Copy image address"**
4. In the Admin dashboard → Edit a project → paste the URL
5. Append `=w800-h560-no` to the end for best quality

**Example:**
```
https://lh3.googleusercontent.com/pw/AP1GczO.....=w800-h560-no
```

---

## 🔐 Admin Access

Navigate to `/#/admin` or click the **⚙ Admin** button on the projects page.

Default password is set via the `ADMIN_PASSWORD` environment variable.

**Features:**
- Add / edit / delete projects
- Add photos by URL with optional captions
- Delete individual photos
- Search and filter projects
- View live site without logging out

---

## 🗄️ Database Schema

```sql
projects (
  id            VARCHAR(50) PRIMARY KEY,
  title         VARCHAR(255),
  category      VARCHAR(100),
  location      VARCHAR(255),
  beneficiaries VARCHAR(255),
  year          VARCHAR(50),
  partner       VARCHAR(255),
  status        VARCHAR(50),    -- 'ongoing' | 'completed'
  description   TEXT,
  impact        TEXT,
  sort_order    INTEGER,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
)

photos (
  id          SERIAL PRIMARY KEY,
  project_id  VARCHAR(50) → projects.id (CASCADE DELETE),
  url         TEXT,
  caption     VARCHAR(255),
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ
)
```

---

## 🛠️ Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, Vite 5                  |
| Backend   | Node.js, Express 4                |
| Database  | PostgreSQL (via Railway plugin)   |
| Auth      | JSON Web Tokens (jsonwebtoken)    |
| Hosting   | Railway                           |
| Fonts     | Playfair Display, DM Sans (Google)|

---

## 📞 Support

For any deployment issues, contact your developer or refer to [Railway Docs](https://docs.railway.app).
