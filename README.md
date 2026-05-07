# CodeConnect 🚀  
### AI-Powered Student Collaboration & Smart Project Management Platform

CodeConnect is a full-stack AI-powered collaboration platform designed to help students connect with compatible teammates, communicate effectively, and manage projects intelligently.

The platform combines:
- Swipe-based user matching
- Real-time chat system
- Group collaboration workspace
- AI-generated task management using Gemini AI

Instead of manually finding teammates and dividing work, users can form groups and let AI automatically generate project roadmaps, task assignments, and deadlines.

---

# 🌟 Features

## 🔐 Authentication & Security
- Firebase Authentication
- Secure Login & Signup
- Token-Based Authentication
- Protected Routes

---

## 👤 User Profile Management
Users can:
- Create and update profiles
- Add skills and academic details
- Upload profile photos and resumes
- Showcase interests and expertise

---

## ❤️ Swipe-Based Matching
- Discover student profiles
- Swipe right to like
- Swipe left to pass
- Mutual likes create matches
- Batch-based filtering support

---

## 💬 Real-Time Chat System
Matched users can:
- Send messages
- Continue conversations
- Collaborate effectively

---

## 👥 Group Collaboration
Users can:
- Create groups
- Add matched users
- Collaborate on projects
- Communicate through group chats

---

## 🤖 AI-Based Task Generation
Powered by Google Gemini AI.

Users enter a project idea and the system:
- Generates project roadmap
- Creates tasks automatically
- Assigns tasks to members
- Sets deadlines
- Organizes workflow

---

## 📌 Task Management
- View assigned tasks
- Update task status
- Track project progress
- Manage deadlines

---

## 🏆 Senior Project Showcase
- Upload projects
- Showcase work publicly
- Share GitHub & LinkedIn links
- Explore senior projects

---

# 🛠️ Tech Stack

## Frontend
- React.js
- Vite
- React Router DOM
- CSS

## Backend
- Node.js
- Express.js
- Socket.IO

## Database & Cloud
- Firebase Firestore
- Firebase Authentication
- Firebase Storage
- Firebase Admin SDK

## AI Integration
- Google Gemini API

---

# 🏗️ System Architecture

CodeConnect follows a modular client-server architecture:

```text
Frontend (React)
        ↓
API Requests
        ↓
Backend (Express.js)
        ↓
Firebase Firestore / Gemini AI
```
⚙️ Installation & Setup
1️⃣ Clone Repository
git clone https://github.com/your-username/codeconnect.git
cd codeconnect
2️⃣ Install Dependencies
Backend
npm install
Frontend
cd Frontend
npm install
🔑 Environment Variables

Create a .env file in the root directory:

PORT=5000

GEMINI_API_KEY=your_gemini_api_key

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

▶️ Run the Application
Start Backend
node server.js

Start Frontend
cd Frontend
npm run dev
🔑 Demo Login Credentials
👤 Test User

Email: btbtc23194_ananya@banasthali.in

Password: 123456

👥 Additional Test Accounts
User 1

Email: btbtc23267_akshita@banasthali.in

Password: 123456
