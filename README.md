<div align="center">

<img width="1200" height="475" alt="AI Resume Optimizer Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🚀 AI Resume Optimizer & ATS Analyzer

**A full-stack AI platform that parses, scores, and rewrites resumes for any job description — powered by Gemini AI.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Powered-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)](https://stripe.com)

</div>

---

## ✨ Features

- **📄 Resume Parsing** — Upload PDF resumes and extract structured content instantly
- **🎯 ATS Score Analysis** — Get a 0–100 ATS score with a detailed breakdown across 5 dimensions:
  - Skills Match, Experience Match, Keyword Density, Formatting, Grammar
- **🔍 Semantic Job Matching** — Paste any job description and get tailored match insights
- **✍️ AI-Powered Rewriting** — Receive a fully optimized resume rewrite targeted to the role
- **📊 Analysis Dashboard** — Visual charts of score breakdowns, missing skills, and improvement suggestions
- **🔐 Google Auth** — Sign in with Google via Firebase Authentication
- **💳 Stripe Integration** — Monetization-ready with Stripe payments built in
- **📱 Responsive UI** — Smooth animations with Framer Motion and Tailwind CSS v4

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| AI | Google Gemini AI (`@google/genai`) |
| Backend | Express.js + `tsx` (Node.js) |
| Auth & DB | Firebase v12 (Auth, Firestore) |
| Payments | Stripe |
| PDF Parsing | `pdfjs-dist` |
| Charts | Recharts |
| Animations | Framer Motion (`motion`) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- A [Firebase project](https://console.firebase.google.com) (for Auth + Firestore)
- A [Stripe account](https://stripe.com) (optional, for payments)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/ai-resume-optimizer.git
cd ai-resume-optimizer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
# Required
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"

# Firebase
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""

# Stripe (optional)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
VITE_STRIPE_PUBLISHABLE_KEY=""
```

### 4. Set up Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Google Sign-In** under Authentication → Sign-in methods
3. Create a **Firestore** database (start in test mode for development)
4. Deploy the included Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

### 5. Run the app

```bash
npm run dev
```

The app runs at `http://localhost:3000` (Express serves both the API and the Vite frontend).

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── ResumeUpload.tsx       # PDF upload & parsing UI
│   │   ├── AnalysisDashboard.tsx  # Score breakdown + suggestions
│   │   └── ResumeGenerator.tsx    # AI-optimized resume output
│   ├── services/
│   │   ├── geminiService.ts       # Gemini AI analysis & rewriting
│   │   └── pdfService.ts          # PDF text extraction
│   ├── firebase.ts                # Firebase initialization
│   ├── types.ts                   # TypeScript interfaces
│   ├── App.tsx                    # Root component + auth flow
│   └── main.tsx                   # Entry point
├── server.ts                      # Express API server
├── firestore.rules                # Firestore security rules
├── firebase-blueprint.json        # Firebase project config reference
├── vite.config.ts
└── .env.example
```

---

## 🔑 How It Works

1. **Upload** your resume PDF → `pdfjs-dist` extracts the text content
2. **Paste** a job description into the analysis form
3. **Gemini AI** compares the resume against the JD and returns:
   - An overall ATS score (0–100)
   - Scores for skills match, experience, keyword density, formatting, grammar
   - A list of missing skills and weaknesses
   - Actionable suggestions
   - A fully rewritten, optimized resume
4. **Dashboard** visualizes the results with Recharts and lets you download the optimized version

---

## 🌐 Deployment

The app is designed to run as a single Node.js service (Express + Vite build).

```bash
npm run build     # Builds the React app into /dist
npm run preview   # Preview the production build locally
```

Deploy to any Node.js-compatible platform (Cloud Run, Railway, Render, Fly.io, etc.) by setting the environment variables and running:

```bash
npm run dev   # or point your server to server.ts with tsx
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Built with ❤️ using [Google AI Studio](https://aistudio.google.com) · [Gemini AI](https://ai.google.dev) · [Firebase](https://firebase.google.com)

</div>
