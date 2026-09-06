/**
 * Matcher & Scoring Engine
 * Computes skill match %, registration deadline urgency, and composite ranking score.
 */

const MatcherModule = {
  
  // Calculate exact skill & project overlap %
  calculateSkillMatch(userSkills, userProjects, hackathonSkills) {
    if (!hackathonSkills || hackathonSkills.length === 0) return 70; // default baseline

    const userKeywords = new Set([
      ...userSkills.map(s => s.name.toLowerCase()),
      ...userProjects.flatMap(p => p.tech.map(t => t.toLowerCase()))
    ]);

    let matches = 0;
    hackathonSkills.forEach(req => {
      const reqLower = req.toLowerCase();
      // Direct match or partial match
      const matched = Array.from(userKeywords).some(k => k.includes(reqLower) || reqLower.includes(k));
      if (matched) matches++;
    });

    const matchRatio = matches / hackathonSkills.length;
    // Base score range: 40% - 98%
    const score = Math.round(40 + (matchRatio * 58));
    return Math.min(98, score);
  },

  // Calculate deadline urgency metrics
  getDeadlineInfo(deadlineISO) {
    const now = new Date();
    const deadline = new Date(deadlineISO);
    const diffMs = deadline - now;
    
    if (diffMs <= 0) {
      return {
        expired: true,
        diffHours: 0,
        diffDays: 0,
        displayText: 'Registration Closed',
        urgencyBadge: 'badge-urgent',
        urgencyScore: 0
      };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    let displayText = '';
    let urgencyBadge = 'badge-normal';
    let urgencyScore = 10; // normalized 0-100 score for sorting

    if (diffDays === 0) {
      displayText = `Ends in ${diffHours}h`;
      urgencyBadge = 'badge-urgent pulse-urgent';
      urgencyScore = 100;
    } else if (diffDays <= 3) {
      displayText = `Ends in ${diffDays}d ${remainingHours}h`;
      urgencyBadge = 'badge-urgent';
      urgencyScore = 90;
    } else if (diffDays <= 7) {
      displayText = `Ends in ${diffDays} days`;
      urgencyBadge = 'badge-warning';
      urgencyScore = 70;
    } else {
      displayText = `${diffDays} days left`;
      urgencyBadge = 'badge-normal';
      urgencyScore = Math.max(10, 60 - diffDays);
    }

    return {
      expired: false,
      diffHours,
      diffDays,
      displayText,
      urgencyBadge,
      urgencyScore
    };
  },

  // Dual-Factor Composite Score:
  // Composite Score = (0.60 * Skill Match %) + (0.40 * Deadline Urgency Score)
  calculateCompositeScore(matchScore, urgencyScore) {
    return Math.round((matchScore * 0.60) + (urgencyScore * 0.40));
  },

  // Eligibility Verification Check
  isEligible(hackathon, userProfile) {
    // Guarantees all imported/listed hackathons are checked
    // By default, college & Unstop hackathons targeted at B.Tech/Engineering students are eligible
    if (!hackathon.eligibility) return true;
    const lower = hackathon.eligibility.toLowerCase();
    
    // Unless explicitly restricted to corporate or specific non-engineering degrees, user is eligible
    if (lower.includes('working professionals only') || lower.includes('school students only')) {
      return false;
    }
    return true;
  }
};
