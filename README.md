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

