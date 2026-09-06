/**
 * Unit Test Suite for MLPredictor Engine (TF-IDF & Cosine Similarity)
 * Run using Node.js: node tests/test_ml.js
 */

const MLPredictor = require('../js/mlPredictor.js');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

console.log('==================================================');
console.log('🧪 RUNNING MLPREDICTOR UNIT TESTS');
console.log('==================================================\n');

// Test 1: Tokenizer & Stopword Filtering
console.log('Test Group 1: Tokenization & Stopwords');
const tokens = MLPredictor.tokenize('The ECE student is building an IoT Arduino micro-controller circuit!');
assert(tokens.includes('ece'), 'Tokenizes lowercase terms');
assert(tokens.includes('arduino'), 'Extracts hardware terms');
assert(!tokens.includes('the') && !tokens.includes('is') && !tokens.includes('an'), 'Filters out English stopwords');

// Test 2: Term Frequency Calculation
console.log('\nTest Group 2: Term Frequency (TF) Calculation');
const tf = MLPredictor.computeTF(['python', 'python', 'react']);
assert(tf['python'] === 2/3, 'Computes correct normalized term frequency for python');
assert(tf['react'] === 1/3, 'Computes correct normalized term frequency for react');

// Test 3: Cosine Similarity & Skill Match Score
console.log('\nTest Group 3: ML Match Scoring & Cosine Similarity');
const userSkills = [
  { name: 'Python', level: 'Advanced' },
  { name: 'Embedded C', level: 'Intermediate' },
  { name: 'Sensors', level: 'Intermediate' }
];

const userProjects = [
  { title: 'IoT Weather Node', desc: 'ESP32 sensor telemetry using Python backend', tech: ['Python', 'ESP32'] }
];

const highFitHackathon = {
  title: 'Hardware & IoT Innovation Challenge',
  skills: ['Python', 'Embedded C', 'Sensors'],
  description: 'Build low-power IoT sensor prototypes and telemetry backend using Python and microcontrollers.',
  deadlineInfo: { expired: false, diffDays: 2 }
};

const resultHigh = MLPredictor.predictSuitability(userSkills, userProjects, highFitHackathon);
assert(resultHigh.score >= 75, `High skill alignment yields match score >= 75 (Got: ${resultHigh.score}%)`);
assert(resultHigh.matchingKeywords.length > 0, 'Detects matching keyword features');

// Test 4: Urgency Weighting in Composite ML Score
console.log('\nTest Group 4: Composite Urgency Ranking');
const urgentHackathon = {
  title: 'Urgent Smart India Hackathon',
  skills: ['Python'],
  description: 'National challenge.',
  deadlineInfo: { expired: false, diffDays: 0 } // Ends today!
};

const relaxedHackathon = {
  title: 'Future AI Challenge',
  skills: ['Python'],
  description: 'National challenge.',
  deadlineInfo: { expired: false, diffDays: 20 } // 20 days left
};

const resUrgent = MLPredictor.predictSuitability(userSkills, userProjects, urgentHackathon);
const resRelaxed = MLPredictor.predictSuitability(userSkills, userProjects, relaxedHackathon);

assert(resUrgent.compositeScore > resRelaxed.compositeScore, `Urgent deadline boosts composite score (Urgent: ${resUrgent.compositeScore}% vs Relaxed: ${resRelaxed.compositeScore}%)`);

console.log('\n==================================================');
console.log(`RESULTS: ${testsPassed} Passed, ${testsFailed} Failed.`);
console.log('==================================================');

if (testsFailed > 0) {
  process.exit(1);
}
