# Interview Practice Partner  
AI-powered mock interview agent for realistic, adaptive interview preparation.  


---

## Features

### Voice-First Interaction (Preferred Mode)
- Hold-to-speak voice input  
- Text-to-speech interviewer responses  
- Text fallback available  

### Realistic Interview Experience
- Supports multiple interview roles  
- Dynamically generated questions (no hardcoded list)  
- Adaptive follow-ups based on user responses  
- Natural handling of confused, off-topic, or hesitant users  

### Intelligent Agent Behavior
- Detects user intent  
- Redirects conversation when needed  
- Adjusts question difficulty  
- Provides rephrased questions and examples  

### Comprehensive Feedback System
- Full transcript analysis  
- Scores across multiple dimensions  
- STAR method detection  
- Actionable personalized suggestions  

---

## Design Decisions 

### 1. Dynamic Questioning  
No hardcoded questions. The InterviewAgent uses Gemini 2.0 Flash to generate contextual, adaptive questions based on conversation history.

### 2. Natural Conversational Flow  
The model is prompted to respond like a real interviewer—short acknowledgments, smooth transitions, and one question at a time.

### 3. Voice-First Implementation  
Uses Web Speech API (speech recognition + synthesis). Falls back to text if microphone isn’t available.

### 4. Holistic Feedback
FeedbackAgent analyzes the entire transcript to evaluate communication, technical skill, culture fit, confidence, and STAR usage.

### 5. Session-Based State Tracking  
In-memory SessionManager stores the ongoing context, topics covered, and user intent for continuity and adaptation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                    │
│  • Web Speech API for voice I/O                         │
│  • Chat interface                                       │
│  • Feedback display                                     │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                 Express.js Backend Server                │
├─────────────────────────────────────────────────────────┤
│  SessionManager     • Maintains context and history      │
│  InterviewAgent     • Dynamic interviewer logic          │
│  FeedbackAgent      • Final feedback generation          │
│  Prompts            • Role-specific interview contexts   │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                Google Gemini 2.0 Flash API              │
│   • Question generation                                 │
│   • User intent detection                               │
│   • Feedback synthesis                                  │
└─────────────────────────────────────────────────────────┘
```
---
## Project Structure
```
interview-practice-partner/
├── server/
│ ├── index.js # Express routes & API endpoints
│ ├── agents/
│ │ ├── interviewAgent.js # Core interview logic
│ │ ├── feedbackAgent.js # Feedback engine
│ │ └── prompts.js # Role contexts
│ └── utils/
│ └── sessionManager.js # Session state manager
├── public/
│ ├── index.html # Frontend UI
│ ├── styles.css # Styling (dark theme)
│ └── app.js # Voice & chat logic
├── package.json
├── .env
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18 or higher  
- Google Gemini API key  
  Get from: https://aistudio.google.com/app/apikey

---

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd interview-practice-partner

# Install dependencies
npm install

```
## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/start-interview | POST | Start new interview session |
| /api/respond | POST | Submit answer & get next question |
| /api/feedback | POST | Generate final interview report |
| /api/clarify | POST | Handle confused user queries |
| /api/session/:id | GET | Retrieve session data |


## Limitations & Future Improvements

- Add multilingual interview support  
- Add database for saving user history  
- More detailed analytics dashboard  
- Improved speech naturalness  
- Support for custom interview roles  




