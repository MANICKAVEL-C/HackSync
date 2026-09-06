/**
 * Matcher & Scoring Engine — Skill Overlap, Deadline Urgency & Authenticity Shield
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

  // Scam & Circular Authenticity Shield
  verifyAuthenticity(hackathon) {
    if (!hackathon) return { status: 'verified', badge: '🛡️ Verified Official', trustScore: 95, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    const platform = (hackathon.platform || '').toLowerCase();
    const link = (hackathon.link || '').toLowerCase();
    const desc = (hackathon.description || '').toLowerCase();

    // Trusted institutional domains & platforms
    const trustedDomains = ['citchennai.net', 'citchennai.edu.in', 'gov.in', 'edu', 'ac.in', 'unstop.com', 'devpost.com', 'ieee.org', 'shaastra.org', 'isro.gov.in', 'ti.com', 'drdo.gov.in'];
    const isTrustedDomain = trustedDomains.some(d => platform.includes(d) || link.includes(d) || desc.includes(d));

    if (isTrustedDomain || platform.includes('government') || platform.includes('college') || platform.includes('unstop') || platform.includes('devpost')) {
      return {
        status: 'verified',
        badge: '🛡️ Verified Official',
        trustScore: 98,
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }

    // Flag unverified free email accounts or suspicious registration links
    if (link.includes('forms.gle') || desc.includes('@gmail.com') || desc.includes('@yahoo.com')) {
      return {
        status: 'unverified',
        badge: '⚠️ Unverified (Verify Source)',
        trustScore: 60,
        colorClass: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    }

    return {
      status: 'standard',
      badge: '✓ Standard Listing',
      trustScore: 85,
      colorClass: 'bg-slate-100 text-slate-700 border-slate-200'
    };
  },

  // Eligibility Verification Check
  isEligible(hackathon, userProfile) {
    if (!hackathon.eligibility) return true;
    const lower = hackathon.eligibility.toLowerCase();
    
    if (lower.includes('working professionals only') || lower.includes('school students only')) {
      return false;
    }
    return true;
  }
};
