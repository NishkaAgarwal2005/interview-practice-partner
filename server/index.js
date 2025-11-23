require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { InterviewAgent } = require('./agents/interviewAgent');
const { FeedbackAgent } = require('./agents/feedbackAgent');
const { SessionManager } = require('./utils/sessionManager');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const sessionManager = new SessionManager();
const interviewAgent = new InterviewAgent(process.env.GEMINI_API_KEY);
const feedbackAgent = new FeedbackAgent(process.env.GEMINI_API_KEY);

// Start a new interview session
app.post('/api/start-interview', async (req, res) => {
  try {
    const { role, experienceLevel, focusAreas } = req.body;
    const session = sessionManager.createSession({ role, experienceLevel, focusAreas });
    
    const intro = await interviewAgent.startInterview(session);
    sessionManager.addMessage(session.id, 'assistant', intro.message);
    
    res.json({ sessionId: session.id, message: intro.message, metadata: intro.metadata });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

// Process user response and get next question
app.post('/api/respond', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const session = sessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    sessionManager.addMessage(sessionId, 'user', message);
    
    const response = await interviewAgent.processResponse(session, message);
    sessionManager.addMessage(sessionId, 'assistant', response.message);
    
    if (response.metadata) {
      sessionManager.updateMetadata(sessionId, response.metadata);
    }
    
    res.json({
      message: response.message,
      isComplete: response.isComplete || false,
      questionNumber: session.questionCount,
      metadata: response.metadata
    });
  } catch (err) {
    console.error('Respond error:', err);
    res.status(500).json({ error: 'Failed to process response' });
  }
});

// Get post-interview feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = sessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    const feedback = await feedbackAgent.generateFeedback(session);
    sessionManager.endSession(sessionId);
    
    res.json(feedback);
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

// Get session state (for reconnection)
app.get('/api/session/:sessionId', (req, res) => {
  const session = sessionManager.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session: { ...session, messages: session.messages.slice(-10) } });
});

// Handle off-topic or confused user
app.post('/api/clarify', async (req, res) => {
  try {
    const { sessionId, userMessage } = req.body;
    const session = sessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    const clarification = await interviewAgent.handleClarification(session, userMessage);
    sessionManager.addMessage(sessionId, 'assistant', clarification.message);
    
    res.json(clarification);
  } catch (err) {
    console.error('Clarify error:', err);
    res.status(500).json({ error: 'Failed to clarify' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));