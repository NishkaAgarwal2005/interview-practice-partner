const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSystemPrompt, getRoleContext } = require('./prompts');

class InterviewAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
   // this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async startInterview(session) {
    const { role, experienceLevel, focusAreas } = session.config;
    const roleContext = getRoleContext(role);
    
    const prompt = `You are an expert interviewer conducting a ${role} interview.
Candidate experience level: ${experienceLevel}
${focusAreas ? `Focus areas: ${focusAreas.join(', ')}` : ''}

${roleContext}

Start the interview naturally:
1. Briefly introduce yourself as the interviewer, greet the user saying "I am your interview partner"
2. Make the candidate comfortable with a warm greeting
3. Ask your FIRST interview question - make it an open-ended question appropriate for their experience level

Keep your response conversational and under 100 words. Do NOT list multiple questions.
Return your response in this JSON format:
{
  "message": "your spoken response",
  "metadata": {
    "questionType": "behavioral|technical|situational",
    "skillBeingAssessed": "skill name",
    "difficultyLevel": 1-5
  }
}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { message: text, metadata: { questionType: 'behavioral', skillBeingAssessed: 'introduction', difficultyLevel: 1 } };
    }
  }

  async processResponse(session, userMessage) {
    const { role, experienceLevel } = session.config;
    const history = this.formatHistory(session.messages);
    const questionCount = session.questionCount || 0;
    const maxQuestions = 6;

    // Detect if user is confused, off-topic, or needs help
    const userIntent = await this.analyzeUserIntent(userMessage, session);
    
    if (userIntent.needsClarification) {
      return this.handleClarification(session, userMessage);
    }

    if (userIntent.isOffTopic) {
      return this.redirectUser(session, userMessage);
    }

    const prompt = `You are an expert ${role} interviewer. You must act like a real human interviewer.

CONVERSATION HISTORY:
${history}

CANDIDATE'S LATEST RESPONSE: "${userMessage}"

INTERVIEW STATE:
- Question ${questionCount + 1} of ${maxQuestions}
- Experience Level: ${experienceLevel}
- Previous topics covered: ${session.metadata?.topicsCovered?.join(', ') || 'none yet'}

YOUR TASK:
1. First, briefly acknowledge their answer (1 sentence max - be natural, not robotic)
2. If their answer was vague or incomplete, ask a FOLLOW-UP question to dig deeper
3. If their answer was good, move to a NEW question on a different topic/skill
4. Adapt difficulty based on their performance so far

${questionCount >= maxQuestions - 1 ? 'This is the FINAL question. After their response, wrap up the interview warmly.' : ''}

BE NATURAL - vary your responses. Don't always say "Great answer!" or "That's interesting!"

Return JSON:
{
  "message": "your spoken response",
  "isFollowUp": true/false,
  "isComplete": ${questionCount >= maxQuestions},
  "metadata": {
    "questionType": "behavioral|technical|situational|follow-up",
    "skillBeingAssessed": "skill name",
    "responseQuality": "excellent|good|fair|needs-improvement",
    "topicsCovered": ["list", "of", "topics"],
    "difficultyLevel": 1-5
  }
}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      session.questionCount = (session.questionCount || 0) + (parsed.isFollowUp ? 0 : 1);
      return parsed;
    } catch {
      session.questionCount = (session.questionCount || 0) + 1;
      return { message: text, isComplete: questionCount >= maxQuestions };
    }
  }

  async analyzeUserIntent(message, session) {
    const prompt = `Analyze this interview response:
"${message}"

Context: This is a ${session.config.role} interview.

Determine:
1. Is the user confused or asking for help/clarification?
2. Is the response completely off-topic (not related to interview at all)?
3. Is this a valid interview response (even if brief or imperfect)?

Return JSON only:
{
  "needsClarification": boolean,
  "isOffTopic": boolean,
  "isValidResponse": boolean,
  "reason": "brief explanation"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(text);
    } catch {
      return { needsClarification: false, isOffTopic: false, isValidResponse: true };
    }
  }

  async handleClarification(session, userMessage) {
    const lastQuestion = session.messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    
    const prompt = `The interview candidate seems confused or needs clarification.

Their message: "${userMessage}"
Last question asked: "${lastQuestion}"
Role: ${session.config.role}

Respond helpfully:
1. Acknowledge their confusion warmly
2. Rephrase or clarify the question in simpler terms
3. Optionally give a hint about what kind of answer you're looking for

Be encouraging, not condescending. Keep under 80 words.

Return JSON: { "message": "your response", "metadata": { "action": "clarification" } }`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      return JSON.parse(text);
    } catch {
      return { message: text, metadata: { action: 'clarification' } };
    }
  }

  async redirectUser(session, userMessage) {
    const prompt = `The interview candidate went off-topic.
Their message: "${userMessage}"
Role: ${session.config.role} interview

Gently redirect them back to the interview:
1. Briefly acknowledge what they said (don't ignore them)
2. Smoothly transition back to the interview
3. Either repeat your last question or ask a new one

Be friendly but professional. Keep under 80 words.

Return JSON: { "message": "your response", "metadata": { "action": "redirect" } }`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      return JSON.parse(text);
    } catch {
      return { message: text, metadata: { action: 'redirect' } };
    }
  }

  formatHistory(messages) {
    return messages.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  }
}

module.exports = { InterviewAgent };