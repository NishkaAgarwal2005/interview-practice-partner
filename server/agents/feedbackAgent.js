const { GoogleGenerativeAI } = require('@google/generative-ai');

class FeedbackAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    //this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async generateFeedback(session) {
    const { role, experienceLevel } = session.config;
    const conversation = this.formatConversation(session.messages);

    const prompt = `You are an expert interview coach analyzing a completed ${role} interview.

FULL INTERVIEW TRANSCRIPT:
${conversation}

CANDIDATE INFO:
- Role: ${role}
- Experience Level: ${experienceLevel}

Provide comprehensive, actionable feedback. Be specific - reference actual things they said.

Analyze and return JSON:
{
  "overallScore": 1-10,
  "summary": "2-3 sentence overall assessment",
  "strengths": [
    {
      "area": "strength name",
      "evidence": "specific example from their responses",
      "impact": "why this matters for the role"
    }
  ],
  "improvements": [
    {
      "area": "improvement area",
      "issue": "specific problem observed",
      "suggestion": "concrete actionable advice",
      "example": "example of better response"
    }
  ],
  "skillScores": {
    "communication": { "score": 1-10, "notes": "brief note" },
    "technicalKnowledge": { "score": 1-10, "notes": "brief note" },
    "problemSolving": { "score": 1-10, "notes": "brief note" },
    "cultureFit": { "score": 1-10, "notes": "brief note" },
    "confidence": { "score": 1-10, "notes": "brief note" }
  },
  "starMethodUsage": {
    "used": boolean,
    "feedback": "advice on using STAR method"
  },
  "topPriorityAction": "The ONE thing they should focus on improving first",
  "interviewerPerspective": "What a real interviewer would likely think about this candidate"
}

Be encouraging but honest. Specific feedback > generic praise.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      console.error('Feedback parse error:', err);
      return this.getFallbackFeedback();
    }
  }

  formatConversation(messages) {
    return messages.map((m, i) => {
      const role = m.role === 'assistant' ? 'INTERVIEWER' : 'CANDIDATE';
      return `[${i + 1}] ${role}: ${m.content}`;
    }).join('\n\n');
  }

  getFallbackFeedback() {
    return {
      overallScore: 5,
      summary: "Interview completed. Detailed analysis unavailable.",
      strengths: [{ area: "Participation", evidence: "Completed the interview", impact: "Shows commitment" }],
      improvements: [{ area: "General", issue: "Review your responses", suggestion: "Practice more", example: "N/A" }],
      skillScores: {
        communication: { score: 5, notes: "Adequate" },
        technicalKnowledge: { score: 5, notes: "Adequate" },
        problemSolving: { score: 5, notes: "Adequate" },
        cultureFit: { score: 5, notes: "Adequate" },
        confidence: { score: 5, notes: "Adequate" }
      },
      starMethodUsage: { used: false, feedback: "Consider using the STAR method for behavioral questions" },
      topPriorityAction: "Practice with more mock interviews",
      interviewerPerspective: "Candidate completed the interview process."
    };
  }
}

module.exports = { FeedbackAgent };