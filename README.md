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
## 📸 Screenshots

---

### 🌐 Landing Pages

![Landing1](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/LandingPg1.png?raw=true)

![Landing2](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/LandingPg2.png?raw=true)

![Landing3](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/LandingPg3.png?raw=true)

![Landing4](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/LandingPg4.png?raw=true)

![Landing5](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/LandingPg5.png?raw=true)

![Landing6](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/LandingPg6.png?raw=true)

---

### 🔐 Authentication

![Login](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Login.png?raw=true)

![Register](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Register.png?raw=true)

---

### 🏠 Home

![Home](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Home.png?raw=true)

---

### 📤 Resume Upload

![Uploads](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Uploads.png?raw=true)

---

### 📝 Job Description

![JobDefine](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Jobdefine.png?raw=true)

---

### 📊 Dashboard

![Dashboard](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Dashboard.png?raw=true)

---

### 🤖 Interview Analysis

![Interview1](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Interview1.png?raw=true)

![Interview2](https://github.com/Harshita-Paliwal/NextHireAI/blob/b567e34eed60a0ee099814aac8bfb064121cf44f/Interview2.png?raw=true)
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

### Frontend (`web-app/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### AI Backend (`backend/.env`)

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
cd backend
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
cd web-app
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



