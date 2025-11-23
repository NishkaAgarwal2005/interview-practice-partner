const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    // Clean up old sessions every 30 minutes
    setInterval(() => this.cleanupSessions(), 30 * 60 * 1000);
  }

  createSession(config) {
    const id = uuidv4();
    const session = {
      id,
      config: {
        role: config.role || 'general',
        experienceLevel: config.experienceLevel || 'mid-level',
        focusAreas: config.focusAreas || []
      },
      messages: [],
      metadata: {
        topicsCovered: [],
        responseQualities: [],
        startTime: Date.now()
      },
      questionCount: 0,
      status: 'active'
    };
    
    this.sessions.set(id, session);
    return session;
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  addMessage(sessionId, role, content) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    session.messages.push({
      role,
      content,
      timestamp: Date.now()
    });
    
    return session;
  }

  updateMetadata(sessionId, metadata) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Merge topics covered
    if (metadata.topicsCovered) {
      const existing = new Set(session.metadata.topicsCovered);
      metadata.topicsCovered.forEach(t => existing.add(t));
      session.metadata.topicsCovered = [...existing];
    }
    
    // Track response qualities
    if (metadata.responseQuality) {
      session.metadata.responseQualities.push(metadata.responseQuality);
    }
    
    // Store other metadata
    session.metadata = { ...session.metadata, ...metadata };
    
    return session;
  }

  incrementQuestionCount(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.questionCount++;
    return session.questionCount;
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    session.status = 'completed';
    session.metadata.endTime = Date.now();
    session.metadata.duration = session.metadata.endTime - session.metadata.startTime;
    
    return session;
  }

  cleanupSessions() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, session] of this.sessions.entries()) {
      if (session.metadata.startTime < oneHourAgo && session.status === 'completed') {
        this.sessions.delete(id);
      }
    }
  }

  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const qualities = session.metadata.responseQualities;
    const qualityScores = { 'excellent': 4, 'good': 3, 'fair': 2, 'needs-improvement': 1 };
    
    const avgQuality = qualities.length > 0
      ? qualities.reduce((sum, q) => sum + (qualityScores[q] || 2), 0) / qualities.length
      : 0;
    
    return {
      questionCount: session.questionCount,
      topicsCovered: session.metadata.topicsCovered,
      averageQuality: avgQuality,
      duration: session.metadata.endTime 
        ? session.metadata.endTime - session.metadata.startTime 
        : Date.now() - session.metadata.startTime
    };
  }
}

module.exports = { SessionManager };