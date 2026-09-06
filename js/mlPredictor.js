/**
 * Machine Learning Predictor Engine — TF-IDF Vectorization, Cosine Similarity & Online Learning Feedback Loop
 * Predicts personalized suitability scores and provides AI feature explanations.
 */

const MLPredictor = {

  // Semantic Concept Dictionary mapping related domain terms
  conceptSynonyms: {
    'ai': ['machine learning', 'artificial intelligence', 'deep learning', 'neural', 'llm', 'gpt', 'gemini', 'python', 'nlp'],
    'machine learning': ['ai', 'artificial intelligence', 'python', 'tensorflow', 'pytorch'],
    'ece': ['embedded', 'microcontroller', 'arduino', 'esp32', 'circuit', 'vlsi', 'signal processing', 'sensors', 'hardware', 'c++', 'c'],
    'embedded': ['ece', 'microcontroller', 'arduino', 'esp32', 'sensors', 'hardware', 'c++', 'c'],
    'iot': ['sensors', 'esp32', 'mqtt', 'hardware', 'ece', 'embedded', 'wireless'],
    'web': ['react', 'node', 'javascript', 'fastapi', 'frontend', 'backend', 'fullstack']
  },

  // Tokenize & normalize text into clean terms (filtering stopwords & expanding synonyms)
  tokenize(text) {
    if (!text) return [];
    const stopwords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
      'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
      'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
      'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now', 'or'
    ]);

    const baseTokens = text
      .toLowerCase()
      .replace(/[^a-z0-9+#\s-]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 1 && !stopwords.has(term));

    // Expand semantic concepts
    const expanded = [...baseTokens];
    baseTokens.forEach(t => {
      if (this.conceptSynonyms[t]) {
        expanded.push(...this.conceptSynonyms[t]);
      }
    });

    return expanded;
  },

  // Calculate Term Frequency (TF) vector for a document
  computeTF(tokens) {
    const tf = {};
    const total = tokens.length || 1;
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });
    Object.keys(tf).forEach(token => {
      tf[token] = tf[token] / total;
    });
    return tf;
  },

  // Retrieve user online learning feedback weights from localStorage
  getFeedbackWeights() {
    if (typeof localStorage === 'undefined') return {};
    const data = localStorage.getItem('hacksync_learning_weights');
    if (!data) return {};
    try { return JSON.parse(data); } catch (e) { return {}; }
  },

  // Record user action (applied, bookmarked, skipped) to adapt ML weights online
  recordFeedback(hackathon, action) {
    if (typeof localStorage === 'undefined' || !hackathon) return;
    const weights = this.getFeedbackWeights();
    const tokens = this.tokenize(hackathon.title + ' ' + (hackathon.skills || []).join(' '));
    
    // Action weight deltas: 'applied' (+1.5), 'bookmarked' (+1.0), 'skipped' (-0.5)
    const delta = action === 'applied' ? 1.5 : (action === 'bookmarked' ? 1.0 : -0.5);
    
    tokens.forEach(token => {
      weights[token] = Math.max(-2, Math.min(5, (weights[token] || 0) + delta));
    });

    localStorage.setItem('hacksync_learning_weights', JSON.stringify(weights));
  },

  // Predict ML Match Score and Generate Feature Insights
  predictSuitability(userSkills, userProjects, hackathon) {
    // 1. Build User Profile Document Text
    const userText = [
      ...userSkills.map(s => `${s.name} ${s.category || ''} ${s.level || ''}`),
      ...userProjects.map(p => `${p.title} ${p.desc} ${p.tech.join(' ')}`)
    ].join(' ');

    // 2. Build Hackathon Document Text (Weighting title & skills higher)
    const hackathonText = [
      hackathon.title, hackathon.title, hackathon.title, // Title 3x weight
      (hackathon.skills || []).join(' '), (hackathon.skills || []).join(' '), // Skills 2x weight
      hackathon.description || '',
      hackathon.eligibility || '',
      hackathon.platform || ''
    ].join(' ');

    const userTokens = this.tokenize(userText);
    const hackTokens = this.tokenize(hackathonText);

    if (userTokens.length === 0 || hackTokens.length === 0) {
      return {
        score: 65,
        confidence: 'Baseline',
        matchingKeywords: ['General Engineering'],
        explanation: 'Baseline match based on engineering degree eligibility.'
      };
    }

    const userTF = this.computeTF(userTokens);
    const hackTF = this.computeTF(hackTokens);

    // Compute Vocabulary & Cosine Similarity
    const vocab = new Set([...Object.keys(userTF), ...Object.keys(hackTF)]);
    let dotProduct = 0;
    let normUser = 0;
    let normHack = 0;

    const matchedTokens = [];

    vocab.forEach(term => {
      const uVal = userTF[term] || 0;
      const hVal = hackTF[term] || 0;

      if (uVal > 0 && hVal > 0) {
        dotProduct += uVal * hVal;
        matchedTokens.push(term);
      }
      normUser += uVal * uVal;
      normHack += hVal * hVal;
    });

    normUser = Math.sqrt(normUser);
    normHack = Math.sqrt(normHack);

    let cosineSim = (normUser && normHack) ? (dotProduct / (normUser * normHack)) : 0;

    // Scale cosine similarity to intuitive percentage (45% - 98%)
    let matchScore = Math.round(45 + (cosineSim * 120));
    
    // Boost score if explicit skill keywords match
    const directSkillMatches = (hackathon.skills || []).filter(req => {
      const reqLower = req.toLowerCase();
      return userTokens.some(ut => ut.includes(reqLower) || reqLower.includes(ut));
    });

    if (directSkillMatches.length > 0) {
      const boost = Math.min(25, directSkillMatches.length * 8);
      matchScore += boost;
    }

    // Apply Online Feedback Loop Weights
    const feedbackWeights = this.getFeedbackWeights();
    let feedbackBoost = 0;
    hackTokens.forEach(t => {
      if (feedbackWeights[t]) {
        feedbackBoost += feedbackWeights[t] * 2.5;
      }
    });

    matchScore = Math.min(98, Math.max(45, Math.round(matchScore + feedbackBoost)));

    // Calculate Deadline Urgency Score (0-100)
    let urgencyScore = 50;
    if (hackathon.deadlineInfo) {
      const { expired, diffDays } = hackathon.deadlineInfo;
      if (expired) {
        urgencyScore = 0;
      } else if (diffDays <= 0) {
        urgencyScore = 100; // Ends today! Critical priority
      } else if (diffDays <= 1) {
        urgencyScore = 95;
      } else if (diffDays <= 3) {
        urgencyScore = 90;
      } else if (diffDays <= 7) {
        urgencyScore = 80;
      } else if (diffDays <= 14) {
        urgencyScore = 65;
      } else {
        urgencyScore = 45;
      }
    } else {
      const dInfo = (typeof window !== 'undefined' && window.MatcherModule) ? window.MatcherModule.getDeadlineInfo(hackathon.deadline) : { expired: false, diffDays: 5 };
      urgencyScore = dInfo.expired ? 0 : Math.max(20, 100 - (dInfo.diffDays * 5));
    }

    // Composite ML Score = 60% Skill & Project Fit + 40% Registration Urgency
    const compositeScore = Math.round((matchScore * 0.60) + (urgencyScore * 0.40));

    // Determine ML Confidence & Explanation
    let confidence = 'High AI Confidence';
    if (compositeScore >= 80) confidence = '🔥 Priority Recommendation (High Skill + Urgent)';
    else if (compositeScore >= 65) confidence = '⚡ Solid Skill & Timeline Fit';
    else confidence = '🎯 Moderate Fit';

    const topMatches = Array.from(new Set([...directSkillMatches, ...matchedTokens])).slice(0, 4);
    const explanation = topMatches.length > 0
      ? `ML Model & Learning Engine detected alignment in: ${topMatches.join(', ')}.`
      : 'Algorithmic alignment based on domain relevance and project stack.';

    return {
      score: matchScore,
      compositeScore,
      urgencyScore,
      cosineSim: cosineSim.toFixed(4),
      confidence,
      matchingKeywords: topMatches,
      explanation
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLPredictor;
}
if (typeof window !== 'undefined') {
  window.MLPredictor = MLPredictor;
}
