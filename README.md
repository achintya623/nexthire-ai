# NextHire AI

AI-powered recruitment intelligence platform that automates resume screening and enhances interview preparation using machine learning.

---

## 🚀 Features

- 📄 **Resume Screening** — Analyze resumes against job descriptions using AI
- 🎯 **Match Scoring** — Generate candidate-job fit scores (0–100%)
- 🧠 **Interview Intelligence** — AI-generated interview insights and suggestions
- 📊 **Candidate Management** — Track candidates across hiring stages
- 🔐 **Authentication System** — Secure login, registration, and password reset

---

## 🧱 Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **AI Engine:** Python (Flask / FastAPI)
- **Database:** PostgreSQL

---

## 🧩 Architecture

Frontend → Node Backend → AI Service → PostgreSQL

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/achintya623/nexthire-ai.git
cd nexthire-ai
```

---

## 🔑 Environment Setup

Each service requires its own `.env` file.

### Node Backend (`node-backend/.env`)

```env
PORT=5000
JWT_SECRET=your_secret
DATABASE_URL=postgresql://username:password@localhost:5432/nexthire
FLASK_API=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173
```

---

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### AI Backend (`ai-backend/.env`)

```env
PORT=8000
```

---

## 🗄️ Database Setup

Create database:

```sql
CREATE DATABASE nexthire;
```

Run schema:

```bash
psql -U postgres -d nexthire -f database/schema.sql
```

---

## ▶️ Running the Application

### 1. Start AI Backend

```bash
cd ai-backend
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
python app.py
```

---

### 2. Start Node Backend

```bash
cd node-backend
npm install
npm start
```

---

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📌 Notes

- Ensure AI backend is running on port **8000** before triggering analysis
- Use separate `.env` files for each service
- PostgreSQL must be running locally

---

## 📈 Future Improvements

- Real-time analytics dashboard
- Model optimization for faster inference
- Cloud deployment (Railway / Vercel / Render)
- Multi-user collaboration features

---

## 👥 Contributors

- Achintya Sharma
- Harshita

---
