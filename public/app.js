class InterviewApp {
  constructor() {
    this.sessionId = null;
    this.isRecording = false;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.questionCount = 1;
    this.maxQuestions = 6;
    
    this.initElements();
    this.initEventListeners();
    this.initSpeechRecognition();
  }

  initElements() {
    this.screens = {
      setup: document.getElementById('setup-screen'),
      interview: document.getElementById('interview-screen'),
      feedback: document.getElementById('feedback-screen')
    };
    this.roleSelect = document.getElementById('role');
    this.experienceSelect = document.getElementById('experience');
    this.startBtn = document.getElementById('start-btn');
    this.messagesEl = document.getElementById('messages');
    this.voiceBtn = document.getElementById('voice-btn');
    this.voiceStatus = document.getElementById('voice-status');
    this.textInput = document.getElementById('text-input');
    this.sendBtn = document.getElementById('send-btn');
    this.endEarlyBtn = document.getElementById('end-early-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.questionCounter = document.getElementById('question-counter');
    this.feedbackContent = document.getElementById('feedback-content');
  }

  initEventListeners() {
    this.startBtn.addEventListener('click', () => this.startInterview());
    this.sendBtn.addEventListener('click', () => this.sendTextResponse());
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendTextResponse();
      }
    });
    this.endEarlyBtn.addEventListener('click', () => this.endInterview());
    this.restartBtn.addEventListener('click', () => this.restart());
    
    // Voice button - hold to speak
    this.voiceBtn.addEventListener('mousedown', () => this.startRecording());
    this.voiceBtn.addEventListener('mouseup', () => this.stopRecording());
    this.voiceBtn.addEventListener('mouseleave', () => {
      if (this.isRecording) this.stopRecording();
    });
    // Touch support
    this.voiceBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startRecording();
    });
    this.voiceBtn.addEventListener('touchend', () => this.stopRecording());
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.voiceBtn.style.display = 'none';
      console.warn('Speech recognition not supported');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    let finalTranscript = '';
    
    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim += t;
        }
      }
      this.voiceStatus.textContent = finalTranscript + interim || 'Listening...';
    };
    
    this.recognition.onend = () => {
      if (this.isRecording) {
        this.recognition.start(); // Continue if still holding
      } else if (finalTranscript.trim()) {
        this.sendResponse(finalTranscript.trim());
        finalTranscript = '';
      }
    };
    
    this.recognition.onerror = (e) => {
      console.error('Speech error:', e);
      this.voiceStatus.textContent = 'Error: ' + e.error;
      this.isRecording = false;
      this.voiceBtn.classList.remove('recording');
    };
  }

  startRecording() {
    if (!this.recognition) return;
    this.isRecording = true;
    this.voiceBtn.classList.add('recording');
    this.voiceBtn.querySelector('.voice-text').textContent = 'Listening...';
    this.voiceStatus.textContent = 'Listening...';
    this.synthesis.cancel(); // Stop any ongoing speech
    try {
      this.recognition.start();
    } catch (e) {
      // Already started
    }
  }

  stopRecording() {
    if (!this.recognition) return;
    this.isRecording = false;
    this.voiceBtn.classList.remove('recording');
    this.voiceBtn.querySelector('.voice-text').textContent = 'Hold to Speak';
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens[name].classList.add('active');
  }

  async startInterview() {
    const role = this.roleSelect.value;
    const experienceLevel = this.experienceSelect.value;
    const focusAreas = [...document.querySelectorAll('#focus-areas input:checked')]
      .map(cb => cb.value);
    
    this.startBtn.disabled = true;
    this.startBtn.textContent = 'Starting...';
    
    try {
      const res = await fetch('/api/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, experienceLevel, focusAreas })
      });
      
      const data = await res.json();
      this.sessionId = data.sessionId;
      this.questionCount = 1;
      this.updateQuestionCounter();
      
      this.showScreen('interview');
      this.messagesEl.innerHTML = '';
      this.addMessage('assistant', data.message);
      this.speak(data.message);
      
    } catch (err) {
      console.error('Start error:', err);
      alert('Failed to start interview. Please try again.');
    } finally {
      this.startBtn.disabled = false;
      this.startBtn.textContent = 'Start Interview';
    }
  }

  async sendTextResponse() {
    const message = this.textInput.value.trim();
    if (!message) return;
    this.textInput.value = '';
    await this.sendResponse(message);
  }

  async sendResponse(message) {
    this.addMessage('user', message);
    this.showTyping();
    this.setInputsDisabled(true);
    
    try {
      const res = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, message })
      });
      
      const data = await res.json();
      this.hideTyping();
      this.addMessage('assistant', data.message);
      this.speak(data.message);
      
      if (data.questionNumber) {
        this.questionCount = data.questionNumber;
        this.updateQuestionCounter();
      }
      
      if (data.isComplete) {
        setTimeout(() => this.endInterview(), 2000);
      }
      
    } catch (err) {
      console.error('Response error:', err);
      this.hideTyping();
      this.addMessage('assistant', 'Sorry, I had a technical issue. Could you repeat that?');
    } finally {
      this.setInputsDisabled(false);
    }
  }

  addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = content;
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  showTyping() {
    const div = document.createElement('div');
    div.className = 'message assistant typing-indicator';
    div.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  hideTyping() {
    const typing = this.messagesEl.querySelector('.typing-indicator');
    if (typing) typing.remove();
  }

  setInputsDisabled(disabled) {
    this.textInput.disabled = disabled;
    this.sendBtn.disabled = disabled;
    this.voiceBtn.disabled = disabled;
  }

  updateQuestionCounter() {
    this.questionCounter.textContent = `Question ${this.questionCount} of ${this.maxQuestions}`;
  }

  speak(text) {
    if (!this.synthesis) return;
    this.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    this.synthesis.speak(utterance);
  }

  async endInterview() {
    this.showScreen('feedback');
    this.feedbackContent.innerHTML = '<div class="loading">Analyzing your interview...</div>';
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId })
      });
      
      const feedback = await res.json();
      this.renderFeedback(feedback);
      
    } catch (err) {
      console.error('Feedback error:', err);
      this.feedbackContent.innerHTML = '<p>Failed to generate feedback. Please try again.</p>';
    }
  }

  renderFeedback(f) {
    const getScoreColor = (s) => s >= 7 ? '#10b981' : s >= 5 ? '#f59e0b' : '#ef4444';
    
    this.feedbackContent.innerHTML = `
      <div class="score-card">
        <div class="score-value" style="color: ${getScoreColor(f.overallScore)}">${f.overallScore}/10</div>
        <div class="score-label">Overall Score</div>
        <p style="margin-top: 1rem; color: var(--text-muted)">${f.summary}</p>
      </div>
      
      <div class="priority-action">
        <h3>🎯 Top Priority</h3>
        <p>${f.topPriorityAction}</p>
      </div>
      
      <div class="feedback-section">
        <h3>💪 Strengths</h3>
        ${f.strengths.map(s => `
          <div class="feedback-item">
            <strong>${s.area}</strong>
            <p>${s.evidence}</p>
            <p style="color: var(--text-muted); font-size: 0.875rem">${s.impact}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="feedback-section">
        <h3>📈 Areas for Improvement</h3>
        ${f.improvements.map(i => `
          <div class="feedback-item">
            <strong>${i.area}</strong>
            <p>${i.issue}</p>
            <p style="color: var(--success)">💡 ${i.suggestion}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="feedback-section">
        <h3>📊 Skill Breakdown</h3>
        <div class="skill-scores">
          ${Object.entries(f.skillScores).map(([k, v]) => `
            <div class="skill-score">
              <div class="score" style="color: ${getScoreColor(v.score)}">${v.score}/10</div>
              <div class="label">${k.replace(/([A-Z])/g, ' $1').trim()}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="feedback-section">
        <h3>👔 Interviewer's Perspective</h3>
        <p>${f.interviewerPerspective}</p>
      </div>
      
      <div class="feedback-section">
        <h3>⭐ STAR Method</h3>
        <p>${f.starMethodUsage.feedback}</p>
      </div>
    `;
  }

  restart() {
    this.sessionId = null;
    this.questionCount = 1;
    this.showScreen('setup');
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InterviewApp();
});