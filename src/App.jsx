import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Torus design tokens (from proton.oli.cmu.edu Figma library)
// ---------------------------------------------------------------------------

const T = {
  font: "'Open Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
  bgPrimary: "#f3f4f8",
  bgSecondary: "#ffffff",
  border: "#ced1d9",
  textHigh: "#353740",
  textLow: "#45464c",
  textMuted: "#757682",
  link: "#1b67b2",
  action: "#006cd9",
  danger: "#ce2c31",
  dangerFill: "#feebed",
  navy: "#222439",
  tableSelect: "#deecff",
  tableHover: "#f2f9ff",
  rowStripe: "#f3f4f8",
  tableRow2: "#e3e7eb",
  highlightCardBg: "#ffffff",
  highlightCardBorder: "#ced1d9",
  highlightCardText: "#353740",
  highlightCardSubtext: "#757682",
  buttonBorderBold: "#8ab8e5",
  buttonShadow: "0 2px 4px rgba(0, 52, 99, 0.10)",
  pillShadow: "0 2px 4px rgba(0, 52, 99, 0.10)",
  shadow: "0 2px 10px rgba(0, 50, 99, 0.10)",
};

// Figma dashboard table uses Low / Medium / High labels on proficiency pills.
const CHIP_FIGMA = {
  "Needs Attention": { label: "Low", bg: T.dangerFill, color: "#b60202", warn: true, chevron: false },
  "Watch": { label: "Medium", bg: "#ffecde", color: "#91450e", warn: false, chevron: true },
  "On Track": { label: "High", bg: "#e7fcf3", color: "#175a3d", warn: false, chevron: false },
  "Not enough data": { label: "Not enough data", bg: "#ced1d9", color: "#000", warn: false, chevron: true },
};

const DIST_BAR_COLORS = ["#c2c2c2", "#ce2c31", "#bf5b13", "#218358"];

// Expanded-detail bucket card labels (Figma expanded LO view).
const BUCKET_CARD_LABELS = {
  none: "Not Enough Data",
  low: "Low Proficiency",
  medium: "Medium Proficiency",
  high: "High Proficiency",
};

const PROFICIENCY_ESTIMATE_INTRO =
  "Proficiency is our best estimate of how likely students are to successfully demonstrate the skills associated with a learning objective based on evidence collected from related learning activities. As students complete more practice and assessments, Torus continuously updates this estimate using their successes, mistakes, and practice history. Proficiency is an estimate and becomes more reliable as more evidence is collected.";

const PROFICIENCY_ESTIMATE_LEVELS = [
  {
    label: "Not Enough Data",
    text: "There isn't enough evidence yet to estimate student proficiency. Encourage students to complete more learning activities before drawing conclusions.",
  },
  {
    label: "Low Proficiency",
    text: "Current evidence suggests students are unlikely to successfully demonstrate this learning objective without additional support or practice.",
  },
  {
    label: "Medium Proficiency",
    text: "Current evidence suggests students are developing this learning objective but may benefit from additional practice to build consistency.",
  },
  {
    label: "High Proficiency",
    text: "Current evidence suggests students are likely to successfully demonstrate this learning objective on future opportunities.",
  },
];

function HowProficiencyEstimatedCard() {
  const body = { fontSize: 12.5, color: T.textLow, lineHeight: "19.38px" };
  return (
    <div style={{
      marginTop: 12, background: "#fff", border: `1px solid ${T.border}`,
      borderRadius: 6, padding: "11px 15px", maxWidth: 640,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <p style={{ ...body, margin: 0 }}>{PROFICIENCY_ESTIMATE_INTRO}</p>
      <div style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {PROFICIENCY_ESTIMATE_LEVELS.map((level) => (
          <p key={level.label} style={{ ...body, margin: 0 }}>
            <strong style={{ fontWeight: 700, color: T.textLow }}>{level.label}: </strong>
            {level.text}
          </p>
        ))}
      </div>
    </div>
  );
}

// Proficiency buckets — presentation labels only; underlying buckets (and the
// proficiency calculation) are unchanged. Colors match the Torus purple ramp.
const BUCKETS = [
  {
    id: "none", label: "Not Enough Data", panel: "Students with Not Enough Data", dot: "#9b9ea8", seg: "#caccd3",
    desc: "Student has not completed enough related activities for a reliable estimate.",
  },
  {
    id: "low", label: "Needs Attention", panel: "Students with Low Estimated Proficiency", dot: "#ce2c31", seg: "#f0a6ab",
    desc: "Student performance and/or completion suggest intervention may be helpful.",
  },
  {
    id: "medium", label: "Watch", panel: "Students to Watch", dot: "#d97706", seg: "#f5c97e",
    desc: "Student is making progress but may benefit from additional practice.",
  },
  {
    id: "high", label: "On Track", panel: "Students On Track", dot: "#1d7a46", seg: "#8ecfa8",
    desc: "Student is consistently demonstrating the expected skills.",
  },
];

const CHIP_DESCRIPTIONS = {
  "Not enough data": BUCKETS[0].desc,
  "Needs Attention": BUCKETS[1].desc,
  "Watch": BUCKETS[2].desc,
  "On Track": BUCKETS[3].desc,
};

const CHIP_STYLES = {
  "Needs Attention": { bg: T.dangerFill, color: T.danger },
  "Watch": { bg: "#ffecde", color: "#91450e" },
  "On Track": { bg: "#e6f6ec", color: "#1d7a46" },
  "Not enough data": { bg: "#e6e7ec", color: T.textLow },
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

// Ordered so LO 1 (density) gets the exact roster shown in the Figma frames:
// first 3 → Not Enough Data, next 14 → Low, next 6 → Medium, last 7 → High.
const STUDENT_NAMES = [
  "Specter, Harvey", "Bluth, Michael", "Holt, Raymond",
  "Green, Rachel", "Buffay, Phoebe", "Stark, Tony", "Soprano, Tony", "Skywalker, Luke",
  "Scott, Michael", "Baggins, Frodo", "White, Walter", "Wayne, Bruce", "Lannister, Tyrion",
  "Crane, Frasier", "Simpson, Homer", "Swan, Emma", "House, Gregory",
  "Knope, Leslie", "Granger, Hermione", "Kent, Clark", "Halpert, Jim", "Beesly, Pam", "Schrute, Dwight",
  "Organa, Leia", "Picard, Jean-Luc", "Ripley, Ellen", "Bond, James", "Croft, Lara", "McFly, Marty", "Watson, Joan",
];

const emailFor = (name) => {
  const [last, first] = name.split(", ");
  return `${first}.${last}@testcourse.edu`.toLowerCase().replace(/[^a-z0-9.@-]/g, "");
};

const WEAK_CORRECT_THRESHOLD = 65;

// Question-level activity detail for the density LO (matches Figma activity drill-down).
const DENSITY_QUESTION_ITEMS = [
  {
    id: 1, poolId: "density_basics_pool_v1",
    stem: "Which of the following correctly defines density?",
    learningObjectives: ["Apply the density equation to calculate mass, volume and density of a solid or liquid."],
    attempts: 52, correctPct: 82,
    answers: [
      { text: "Mass divided by volume (m/V)", count: 43, correct: true },
      { text: "Volume divided by mass (V/m)", count: 6, correct: false },
      { text: "Mass times volume (m×V)", count: 2, correct: false },
      { text: "No answer / skipped", count: 1, correct: false },
    ],
    details: { uniqueStudents: 48, avgAttempts: 1.1, skipped: 1 },
  },
  {
    id: 2, poolId: "rearrange_density_pool_v2", type: "multi-input",
    stem: "A block has a volume of 4.0 cm³ and a mass of 12 g. Enter the mass, volume, and calculated density.",
    learningObjectives: ["Rearrange the density equation to solve for mass or volume"],
    attempts: 56, correctPct: 25, firstTryPct: 25, eventualPct: 48,
    inputs: [
      { label: "Mass (g)", expected: "12", correctPct: 88, commonErrors: ["12 g entered correctly by most"] },
      { label: "Volume (cm³)", expected: "4.0", correctPct: 76, commonErrors: ["4 cm³ without decimal", "40 cm³ (unit error)"] },
      { label: "Density (g/cm³)", expected: "3.0", correctPct: 25, commonErrors: ["48 (multiplied instead of divided)", "0.33 (inverted)", "Left blank"] },
    ],
    multiInputSummary: { allFieldsCorrect: 25, atLeastOneCorrect: 82, avgFieldsCorrect: 1.9 },
    details: { uniqueStudents: 50, avgAttempts: 2.4, skipped: 4 },
  },
  {
    id: 3, poolId: "rearrange_density_pool_v2",
    stem: "Rearrange d = m/V to solve for mass.",
    learningObjectives: ["Rearrange the density equation to solve for mass or volume"],
    attempts: 54, correctPct: 42, firstTryPct: 12, eventualPct: 34,
    answers: [
      { text: "m = d × V", count: 23, correct: true },
      { text: "m = V / d", count: 18, correct: false },
      { text: "m = d / V", count: 10, correct: false },
      { text: "No answer / skipped", count: 3, correct: false },
    ],
    details: { uniqueStudents: 49, avgAttempts: 2.1, skipped: 3 },
  },
  {
    id: 4, poolId: "unit_conversion_pool_v1",
    stem: "Convert 2.5 g/cm³ to kg/m³.",
    learningObjectives: ["Select appropriate units for mass, volume, and density"],
    attempts: 47, correctPct: 78,
    answers: [
      { text: "2500 kg/m³", count: 37, correct: true },
      { text: "0.0025 kg/m³", count: 5, correct: false },
      { text: "25 kg/m³", count: 3, correct: false },
      { text: "No answer / skipped", count: 2, correct: false },
    ],
    details: { uniqueStudents: 45, avgAttempts: 1.0, skipped: 2 },
  },
  {
    id: 5, poolId: "liquid_displacement_pool_v1", type: "multi-input",
    stem: "A student measures 15 mL of water displaced by an irregular solid (mass = 45 g). Enter volume, mass, and density.",
    learningObjectives: ["Apply density calculations to liquids using displacement data"],
    attempts: 51, correctPct: 33,
    inputs: [
      { label: "Volume (mL)", expected: "15", correctPct: 71, commonErrors: ["150 (decimal error)", "15 cm³ without noting mL"] },
      { label: "Mass (g)", expected: "45", correctPct: 84, commonErrors: ["450 (unit slip)", "Left blank"] },
      { label: "Density (g/mL)", expected: "3.0", correctPct: 33, commonErrors: ["0.33 (inverted)", "675 (multiplied mass × volume)", "45/15 not simplified"] },
    ],
    multiInputSummary: { allFieldsCorrect: 33, atLeastOneCorrect: 79, avgFieldsCorrect: 1.9 },
    details: { uniqueStudents: 47, avgAttempts: 2.2, skipped: 3 },
  },
  {
    id: 6, poolId: "density_word_pool_v1",
    stem: "Which variable must be held constant when comparing densities of two liquids?",
    learningObjectives: [],
    attempts: 44, correctPct: 60,
    answers: [
      { text: "Temperature", count: 26, correct: true },
      { text: "Container shape", count: 10, correct: false },
      { text: "Mass of the sample", count: 5, correct: false },
      { text: "No answer / skipped", count: 3, correct: false },
    ],
    details: { uniqueStudents: 42, avgAttempts: 1.0, skipped: 3 },
  },
  {
    id: 7, poolId: "mixed_solids_pool_v1",
    stem: "Two cubes of equal volume have masses of 8 g and 24 g. How do their densities compare?",
    learningObjectives: ["Apply the density equation to calculate mass, volume and density of a solid or liquid."],
    attempts: 49, correctPct: 95,
    answers: [
      { text: "The 24 g cube is 3× denser", count: 47, correct: true },
      { text: "They have equal density", count: 1, correct: false },
      { text: "The 8 g cube is denser", count: 1, correct: false },
      { text: "No answer / skipped", count: 0, correct: false },
    ],
    details: { uniqueStudents: 46, avgAttempts: 1.1, skipped: 0 },
  },
  {
    id: 8, poolId: "irregular_object_pool_v1",
    stem: "Why is water displacement used for irregular solids?",
    learningObjectives: ["Apply density calculations to liquids using displacement data"],
    attempts: 46, correctPct: 80,
    answers: [
      { text: "Volume cannot be measured directly with a ruler", count: 37, correct: true },
      { text: "It increases the object's mass", count: 4, correct: false },
      { text: "It converts mass to volume automatically", count: 3, correct: false },
      { text: "No answer / skipped", count: 2, correct: false },
    ],
    details: { uniqueStudents: 44, avgAttempts: 1.0, skipped: 2 },
  },
  {
    id: 9, poolId: "cumulative_density_pool_v1",
    stem: "Identify the correct rate law expression for density rearrangement problems.",
    learningObjectives: ["Rearrange the density equation to solve for mass or volume"],
    attempts: 56, correctPct: 68,
    answers: [
      { text: "m = d × V", count: 38, correct: true },
      { text: "V = m × d", count: 11, correct: false },
      { text: "d = V / m", count: 5, correct: false },
      { text: "No answer / skipped", count: 2, correct: false },
    ],
    details: { uniqueStudents: 50, avgAttempts: 1.1, skipped: 2 },
  },
  {
    id: 10, poolId: "cumulative_density_pool_v1", type: "multi-input",
    stem: "Given d = 0.85 g/mL and V = 200 mL, calculate and enter the mass, restate the density, and show your unit.",
    learningObjectives: ["Apply the density equation to calculate mass, volume and density of a solid or liquid."],
    attempts: 56, correctPct: 24,
    inputs: [
      { label: "Mass (g)", expected: "170", correctPct: 38, commonErrors: ["235 (divided instead of multiplied)", "0.004 (inverted)", "200 (used volume)"] },
      { label: "Density (g/mL)", expected: "0.85", correctPct: 62, commonErrors: ["85 (missing decimal)", "850 (unit conversion error)"] },
      { label: "Unit label", expected: "g", correctPct: 55, commonErrors: ["kg", "g/mL (density unit reused)", "Left blank"] },
    ],
    multiInputSummary: { allFieldsCorrect: 24, atLeastOneCorrect: 74, avgFieldsCorrect: 1.5 },
    details: { uniqueStudents: 50, avgAttempts: 2.6, skipped: 3 },
  },
];

const ACTIVITY_ITEMS_BY_OBJECTIVE = {
  "lo-density": DENSITY_QUESTION_ITEMS,
};

function getActivityItems(objective) {
  if (ACTIVITY_ITEMS_BY_OBJECTIVE[objective.id]) return ACTIVITY_ITEMS_BY_OBJECTIVE[objective.id];
  if (!objective.activities) return [];
  return objective.activities.map((a, i) => ({
    id: i + 1,
    poolId: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30),
    stem: a.name.split(":").slice(1).join(":").trim() || a.name,
    learningObjectives: [objective.title],
    attempts: Math.round(30 * (a.completion / 100) * 1.8),
    correctPct: a.correctness,
    answers: [
      { text: "Correct response", count: Math.round(30 * a.correctness / 100), correct: true },
      { text: "Common incorrect response", count: Math.round(30 * (100 - a.correctness) / 200), correct: false },
      { text: "Other incorrect response", count: Math.round(30 * (100 - a.correctness) / 300), correct: false },
      { text: "No answer / skipped", count: 2, correct: false },
    ],
    details: { uniqueStudents: Math.round(30 * a.completion / 100), avgAttempts: 1.2, skipped: 2 },
  }));
}

function isWeakActivity(correctPct) {
  return correctPct < WEAK_CORRECT_THRESHOLD;
}

// Activity-level summary for the density objective (LO 1).
const DENSITY_ACTIVITIES = [
  { name: "Activity 1: Density Basics Quiz", type: "Quiz", completion: 93, correctness: 71 },
  { name: "Activity 2: Mass & Volume Lab", type: "Lab", completion: 88, correctness: 64 },
  { name: "Activity 3: Unit Conversion Drill", type: "Practice", completion: 76, correctness: 58 },
  { name: "Activity 4: Rearranging d = m/V", type: "Practice", completion: 61, correctness: 42 },
  { name: "Activity 5: Liquid Displacement Lab", type: "Lab", completion: 68, correctness: 47 },
  { name: "Activity 6: Density Word Problems", type: "Homework", completion: 72, correctness: 55 },
  { name: "Activity 7: Mixed Solids Challenge", type: "Quiz", completion: 64, correctness: 51 },
  { name: "Activity 8: Density of Irregular Objects", type: "Lab", completion: 59, correctness: 49 },
  { name: "Activity 9: Cumulative Density Check", type: "Assessment", completion: 54, correctness: 46 },
];

// dist = [Not Enough Data, Low, Medium, High] — always sums to 30.
const OBJECTIVES = [
  {
    id: "lo-density",
    title: "Apply the density equation to calculate mass, volume and density of a solid or liquid.",
    chip: "Needs Attention",
    dist: [3, 14, 6, 7],
    activitiesCount: 9,
    activities: DENSITY_ACTIVITIES,
    // Weekly count of students estimated low proficiency (ends at the current 14).
    trend: [
      { week: "Week 1", count: 18 },
      { week: "Week 2", count: 17 },
      { week: "Week 3", count: 16 },
      { week: "Week 4", count: 15 },
      { week: "Week 5", count: 14 },
    ],
    subObjectives: [
      {
        title: "Derive the rate law consistent with a given reaction mechanism.",
        chip: "Needs Attention", dist: [4, 12, 8, 6],
        relatedActivities: [
          { name: "Rate Law Practice", type: "Practice", correctness: 42, completion: 61 },
          { name: "Reaction Mechanism Quiz", type: "Quiz", correctness: 51, completion: 72 },
          { name: "Mechanism Steps Drill", type: "Practice", correctness: 55, completion: 68 },
        ],
      },
      {
        title: "Describe the effects of chemical nature, physical state, temperature, concentration, and catalysis on reaction rates.",
        chip: "Needs Attention", dist: [3, 13, 8, 6],
        relatedActivities: [
          { name: "Temperature Effects Lab", type: "Lab", correctness: 48, completion: 70 },
          { name: "Concentration & Rate Quiz", type: "Quiz", correctness: 53, completion: 66 },
          { name: "Catalysis Basics", type: "Practice", correctness: 57, completion: 75 },
          { name: "Reaction Rates Homework", type: "Homework", correctness: 50, completion: 63 },
        ],
      },
    ],
  },
  {
    id: "lo-molarity-1",
    title: "Apply the molarity equation to calculate the concentration of a solution.",
    chip: "Not enough data",
    dist: [20, 4, 3, 3],
    activitiesCount: 1,
    activities: null,
    subObjectives: [],
  },
  {
    id: "lo-sigfigs",
    title: "Apply the multiplication and division significant figure rule.",
    chip: "On Track",
    dist: [2, 3, 9, 16],
    activitiesCount: 14,
    activities: null,
    subObjectives: [],
  },
  {
    id: "lo-molarity-2",
    title: "Apply the molarity equation to calculate the concentration of a solution.",
    chip: "Watch",
    dist: [3, 6, 12, 9],
    activitiesCount: 10,
    activities: null,
    subObjectives: [],
  },
  {
    id: "lo-molarity-3",
    title: "Apply the molarity equation to calculate the concentration of a solution.",
    chip: "Watch",
    dist: [2, 7, 13, 8],
    activitiesCount: 3,
    activities: null,
    subObjectives: [],
  },
];

// Deterministic per-objective roster: assigns the 30 students into the
// objective's distribution. Attempted counts from the Figma frame for LO 1's
// Low bucket; generated deterministically elsewhere.
const FIGMA_LOW_ATTEMPTS = [3, 7, 6, 8, 1, 9, 9, 3, 5, 3, 3, 3, 3, 3];

// Score ranges (percent) used to place dots along each bucket region in the scatterplot.
const BUCKET_SCORE_RANGE = {
  none: [5, 22],
  low: [23, 46],
  medium: [47, 74],
  high: [75, 98],
};

// Deterministic scores for the density LO — includes intentional duplicates for stacking.
const FIGMA_DENSITY_SCORES = {
  none: [12, 12, 18],
  low: [28, 28, 28, 28, 32, 32, 35, 35, 38, 38, 38, 38, 41, 41],
  medium: [52, 52, 58, 58, 65, 68],
  high: [78, 82, 82, 88, 88, 88, 95],
};

function proficiencyScoreFor(bucket, k, cursor, loIndex) {
  if (loIndex === 0 && FIGMA_DENSITY_SCORES[bucket]?.[k] != null) {
    return FIGMA_DENSITY_SCORES[bucket][k];
  }
  const [min, max] = BUCKET_SCORE_RANGE[bucket];
  const span = max - min;
  // Cluster ~every 4–5 points so several students share the same score.
  const step = 4 + (cursor % 3);
  const slot = Math.floor(k / 2);
  return min + Math.min(span, (slot * step) % (span + 1));
}

function buildRoster(objective, loIndex) {
  const rotated = STUDENT_NAMES.map((_, i, arr) => arr[(i + loIndex * 7) % arr.length]);
  const roster = [];
  let cursor = 0;
  objective.dist.forEach((count, bucketIdx) => {
    const bucket = BUCKETS[bucketIdx].id;
    for (let k = 0; k < count; k++) {
      const name = rotated[cursor];
      const n = objective.activitiesCount;
      let attempted;
      if (loIndex === 0 && bucket === "low") {
        attempted = FIGMA_LOW_ATTEMPTS[k];
      } else {
        attempted =
          bucket === "none" ? cursor % 2 :
          bucket === "low" ? Math.min(n, 1 + ((cursor * 7) % Math.max(1, Math.floor(n * 0.6)))) :
          bucket === "medium" ? Math.min(n, Math.max(1, Math.ceil(n * 0.6) + (cursor % 3))) :
          Math.min(n, Math.max(1, n - (cursor % 2)));
      }
      const correctness =
        bucket === "none" ? null :
        bucket === "low" ? 25 + ((cursor * 7) % 20) :
        bucket === "medium" ? 50 + ((cursor * 5) % 20) :
        75 + ((cursor * 9) % 20);
      const lastActivity = attempted === 0
        ? null
        : ["Today", "1 day ago", "2 days ago", "3 days ago", "5 days ago", "1 week ago"][cursor % 6];
      const proficiencyScore = bucket === "none"
        ? proficiencyScoreFor("none", k, cursor, loIndex)
        : proficiencyScoreFor(bucket, k, cursor, loIndex);
      roster.push({
        id: `${objective.id}-${name}`, name, email: emailFor(name), bucket,
        attempted, correctness, lastActivity, proficiencyScore,
      });
      cursor++;
    }
  });
  return roster;
}

const ROSTERS = Object.fromEntries(OBJECTIVES.map((lo, i) => [lo.id, buildRoster(lo, i)]));

const TOTAL_STUDENTS = 30;
const PRIORITY = { "Needs Attention": 0, "Not enough data": 1, "Watch": 2, "On Track": 3 };

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

function Chip({ label, scope, variant = "default" }) {
  const s = variant === "figma" ? CHIP_FIGMA[label] : CHIP_STYLES[label];
  const displayLabel = variant === "figma" ? s.label : label;
  return (
    <span
      title={scope ? `${scope} ${CHIP_DESCRIPTIONS[label]}` : CHIP_DESCRIPTIONS[label]}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: s.bg, color: s.color, cursor: "help",
        fontSize: variant === "figma" ? 16 : 12,
        fontWeight: 600, padding: variant === "figma" ? "4px 16px" : "3px 12px",
        borderRadius: 999, whiteSpace: "nowrap",
        boxShadow: variant === "figma" ? T.pillShadow : "none",
      }}
    >
      {variant === "figma" && s.warn && (
        <span style={{ fontSize: 14, lineHeight: 1 }} aria-hidden>⚠</span>
      )}
      {displayLabel}
      {variant === "figma" && s.chevron && (
        <span style={{ fontSize: 10, opacity: 0.7 }} aria-hidden>⌄</span>
      )}
    </span>
  );
}

// Mini segmented distribution bar — matches the existing Torus row pattern.
// Each segment carries a tooltip (count, %, and what the level means); the
// optional caption surfaces the struggling share without hovering.
function MiniDistBar({ dist, width = 96, height = 14, caption = false, variant = "default" }) {
  const total = dist.reduce((a, b) => a + b, 0);
  const pct = (n) => Math.round((n / total) * 100);
  const figma = variant === "figma";
  const bar = (
    <span style={{
      display: "inline-flex", width, height, overflow: "hidden",
      border: figma ? "none" : `1px solid ${T.border}`,
      background: figma ? "transparent" : "#fff",
      gap: figma ? 2 : 1, cursor: "help",
    }}>
      {dist.map((n, i) => (
        <span
          key={BUCKETS[i].id}
          title={`${BUCKETS[i].label}: ${n} student${n === 1 ? "" : "s"} (${pct(n)}%) — ${BUCKETS[i].desc}`}
          style={{
            width: `${(n / total) * 100}%`,
            background: figma ? DIST_BAR_COLORS[i] : BUCKETS[i].seg,
            boxShadow: figma ? "inset 0 1px 7px rgba(0,0,0,0.25)" : "none",
          }}
        />
      ))}
    </span>
  );
  if (!caption) return bar;
  return (
    <span style={{ display: "inline-block" }}>
      {bar}
      <span style={{ display: "block", fontSize: 10.5, color: T.textMuted, marginTop: 3 }}>
        {pct(dist[1])}% of students need attention
      </span>
    </span>
  );
}

// Stub link — navigates to the activity detail view when a handler is provided.
function ActivityLink({ name, onNavigate, style }) {
  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onNavigate(); }}
        style={{
          fontFamily: T.font, background: "none", border: "none", padding: 0, cursor: "pointer",
          color: T.link, fontWeight: 600, textDecoration: "none", ...style,
        }}
      >
        {name}
      </button>
    );
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <a
      href={`#/scored_activities/${slug}`}
      title={`Open ${name} in Scored Activities`}
      onClick={(e) => e.stopPropagation()}
      style={{ color: T.link, fontWeight: 600, textDecoration: "none", ...style }}
    >
      {name}
    </a>
  );
}

function LinkButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: T.font, background: "none", border: "none", padding: 0, cursor: "pointer",
        color: T.link, fontSize: 13, fontWeight: 600, textDecoration: "none", ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page chrome (unchanged from production)
// ---------------------------------------------------------------------------

function TopNav() {
  const items = ["Overview", "Insights", "Manage", "Discussion Activity"];
  return (
    <div style={{ background: T.navy }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", gap: 32,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "linear-gradient(135deg, #4ca6ff, #b94cff)", display: "inline-block",
          }} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
            OLI <span style={{ fontWeight: 400 }}>Torus</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {items.map((item) => {
            const active = item === "Insights";
            return (
              <span key={item} style={{
                color: active ? "#fff" : "rgba(255,255,255,0.75)",
                fontSize: 13, fontWeight: active ? 700 : 400, padding: "16px 12px",
                borderBottom: active ? "2px solid #fff" : "2px solid transparent", cursor: "pointer",
              }}>
                {item}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #4ca6ff",
            color: "#fff", fontSize: 11, fontWeight: 700,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            JF
          </span>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 16 }}>?</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px" }}>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Test Course</span>
        </div>
      </div>
    </div>
  );
}

function InsightsTabs() {
  const tabs = ["Content", "Learning Objectives", "Scored Activities", "Practice Activities", "Surveys"];
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: T.bgPrimary }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0 }}>
        {tabs.map((tab) => {
          const active = tab === "Learning Objectives";
          return (
            <span key={tab} style={{
              position: "relative",
              padding: "16px 12px", fontSize: 14, cursor: "pointer",
              fontWeight: active ? 600 : 400,
              color: T.textHigh,
              borderBottom: active ? `2px solid #0073e5` : "2px solid transparent",
            }}>
              {tab}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ModulePager() {
  return (
    <div style={{
      maxWidth: 1280, margin: "0 auto", padding: "18px 24px 4px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 86,
    }}>
      <span style={{ color: "#0073e5", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>‹</span> Previous Module
      </span>
      <span style={{
        color: T.textHigh, fontSize: 18, fontWeight: 700,
        borderBottom: `2px solid #0073e5`, paddingBottom: 4, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8, minWidth: 280, justifyContent: "center",
      }}>
        Module 2: Reaction Rates <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span>
      </span>
      <span style={{ color: T.action, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
        Next Module <span style={{ fontSize: 16 }}>›</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clickable proficiency bucket cards
// ---------------------------------------------------------------------------

function SecondaryActionButton({ children, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: T.font, cursor: "pointer", background: "#fff",
        border: `1px solid ${T.buttonBorderBold}`, color: T.action, borderRadius: 6,
        padding: "8px 24px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
        boxShadow: T.buttonShadow, display: "inline-flex", alignItems: "center", gap: 8,
      }}
    >
      {icon && <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}

function ProficiencyBuckets({ roster, selectedBucket, onSelectBucket }) {
  const counts = BUCKETS.map((b) => roster.filter((s) => s.bucket === b.id).length);
  const total = roster.length;

  const W = 1000, H = 110, GAP = 8;
  const WEIGHTS = [0.16, 0.4, 0.22, 0.22];
  const TRACK_Y = 94;
  const BAR_H = 8;
  const DOT_R = 4.5;
  const STACK_GAP = 14;
  const MAX_STACK = 5;

  let cursor = 0;
  const regions = BUCKETS.map((b, i) => {
    const w = WEIGHTS[i] * (W - GAP * (BUCKETS.length - 1));
    const students = roster.filter((s) => s.bucket === b.id);
    const r = { ...b, x: cursor, w, count: counts[i], students };
    cursor += w + GAP;
    return r;
  });

  const scoreToX = (score, region) => {
    const [min, max] = BUCKET_SCORE_RANGE[region.id];
    const pad = 22;
    const t = Math.max(0, Math.min(1, (score - min) / (max - min)));
    return region.x + pad + t * (region.w - pad * 2);
  };

  const dotsForRegion = (region) => {
    const groups = new Map();
    region.students.forEach((s) => {
      const key = s.proficiencyScore;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    });
    const dots = [];
    [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .forEach(([score, group]) => {
        const cx = scoreToX(score, region);
        group.slice(0, MAX_STACK).forEach((student, j) => {
          dots.push({ cx, cy: TRACK_Y - 12 - j * STACK_GAP, student, score });
        });
      });
    return dots;
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", marginBottom: 24 }}>
        {regions.map((r) => {
          const dim = selectedBucket && selectedBucket !== r.id;
          const selected = selectedBucket === r.id;
          const dots = dotsForRegion(r);
          return (
            <g
              key={r.id}
              onClick={() => onSelectBucket(selected ? null : r.id)}
              style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity 0.15s" }}
            >
              <title>{`${BUCKET_CARD_LABELS[r.id]}: ${r.count} students (${Math.round((r.count / total) * 100)}%)`}</title>
              {selected && (
                <rect
                  x={r.x - 2} y={4} width={r.w + 4} height={H - 8} rx={8}
                  fill="rgba(0,108,217,0.05)" stroke={T.action} strokeWidth="1.5"
                />
              )}
              <rect x={r.x} y={TRACK_Y} width={r.w} height={BAR_H} rx={4} fill={r.seg} />
              {dots.map((d, k) => (
                <g key={`${d.student.id}-${k}`}>
                  <title>{`${d.student.name}: ${d.score}% proficiency`}</title>
                  <circle cx={d.cx} cy={d.cy} r={DOT_R} fill={r.dot} />
                </g>
              ))}
              <rect x={r.x} y={0} width={r.w} height={H} fill="transparent" />
            </g>
          );
        })}
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {BUCKETS.map((b, i) => {
          const selected = selectedBucket === b.id;
          const pct = Math.round((counts[i] / total) * 100);
          const footer = b.id === "low"
            ? `${pct}% of class`
            : `${pct}% of class · view students`;
          return (
            <button
              key={b.id}
              onClick={() => onSelectBucket(selected ? null : b.id)}
              title={b.desc}
              style={{
                fontFamily: T.font, cursor: "pointer", textAlign: "left",
                background: selected ? T.tableSelect : "#fff",
                border: selected ? `1.5px solid ${T.action}` : `1px solid ${T.border}`,
                borderRadius: 8, padding: selected ? "12px 14px" : "13px 15px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: b.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textHigh }}>
                  {BUCKET_CARD_LABELS[b.id]}
                </span>
              </div>
              <div style={{ fontSize: 21, fontWeight: 700, color: T.textHigh }}>{counts[i]}</div>
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{footer}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend: students with low proficiency over time
// ---------------------------------------------------------------------------

function TrendSection({ trend }) {
  const [show, setShow] = useState(false);
  const W = 560, H = 170;
  const padL = 40, padR = 16, padT = 18, padB = 30;
  const min = 10, max = 20;
  const x = (i) => padL + (i / (trend.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const points = trend.map((d, i) => `${x(i)},${y(d.count)}`).join(" ");

  const last = trend[trend.length - 1].count;
  const prev = trend[trend.length - 2].count;
  const first = trend[0].count;
  const weekChange = last - prev;
  const improving = weekChange < 0;
  const deltaColor = weekChange === 0 ? T.textMuted : improving ? "#1d7a46" : T.danger;

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, background: "#fff", padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textHigh }}>
            Students struggling over time
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            Students estimated as “Needs Attention” at the end of each week.
          </div>
        </div>
        <LinkButton onClick={() => setShow((v) => !v)} style={{ marginLeft: "auto", fontSize: 12.5, flexShrink: 0 }}>
          {show ? "Hide chart" : "Show chart"}
        </LinkButton>
      </div>

      {/* is this getting better or worse? — visible even with the chart hidden */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: T.textHigh }}>{last}</span>
        <span style={{ fontSize: 12.5, color: T.textLow }}>students struggling</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: deltaColor }}>
          {weekChange === 0
            ? "— no change from last week"
            : `${improving ? "▼" : "▲"} ${Math.abs(weekChange)} ${improving ? "fewer" : "more"} than last week`}
        </span>
        {first !== last && (
          <span style={{ fontSize: 12, color: first > last ? "#1d7a46" : T.danger }}>
            · {Math.abs(first - last)} {first > last ? "fewer" : "more"} than Week 1
          </span>
        )}
      </div>

      {show && (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 620, display: "block", marginTop: 8 }}>
          {[10, 12, 14, 16, 18, 20].map((v) => (
            <g key={v}>
              <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={T.rowStripe} strokeWidth="1" />
              <text x={padL - 7} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill={T.textMuted} fontFamily={T.font}>
                {v}
              </text>
            </g>
          ))}
          <polyline points={points} fill="none" stroke={T.danger} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {trend.map((d, i) => (
            <g key={d.week}>
              <circle cx={x(i)} cy={y(d.count)} r="4" fill="#fff" stroke={T.danger} strokeWidth="2.5" />
              <text x={x(i)} y={y(d.count) - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill={T.danger} fontFamily={T.font}>
                {d.count}
              </text>
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill={T.textMuted} fontFamily={T.font}>
                {d.week}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Students panel (appears when a bucket is selected)
// ---------------------------------------------------------------------------

function studentProfileHref(student) {
  const slug = student.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `#/students/${slug}`;
}

function StudentAvatar({ name }) {
  const initials = name.split(", ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span style={{
      width: 24, height: 24, borderRadius: "50%", border: `1px solid ${T.border}`,
      background: T.rowStripe, color: T.textMuted, fontSize: 9, fontWeight: 700,
      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {initials}
    </span>
  );
}

// Low-proficiency students who attempted most related activities — conceptual gap signal.
function isHighActivityLowProficiency(student, totalActivities) {
  return student.bucket === "low" && totalActivities > 0
    && student.attempted / totalActivities >= 0.6;
}

function StudentsPanel({ objective, bucketId, students, onClose }) {
  const bucket = BUCKETS.find((b) => b.id === bucketId);
  const [selected, setSelected] = useState(() => new Set(students.map((s) => s.id)));
  const allChecked = students.length > 0 && students.every((s) => selected.has(s.id));
  const selectedCount = students.filter((s) => selected.has(s.id)).length;
  const highActivityStudents = students.filter(
    (s) => isHighActivityLowProficiency(s, objective.activitiesCount),
  );

  const onToggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onToggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(students.map((s) => s.id)));
  };

  const sendEmail = () => {
    const bcc = students.filter((s) => selected.has(s.id)).map((s) => s.email).join(",");
    const subject = encodeURIComponent(`Checking in: ${objective.title}`);
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}`;
  };

  const th = {
    textAlign: "left", fontSize: 16, fontWeight: 600, color: T.textHigh,
    padding: "10px", background: "#fff", borderBottom: `1px solid ${T.border}`,
    height: 50, verticalAlign: "middle",
  };
  const td = { padding: "10px", fontSize: 16, color: T.textLow, verticalAlign: "middle" };

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 9, background: "#fff", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "8px",
        borderBottom: `1px solid ${T.border}`, minHeight: 62,
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#373a44" }}>
          {bucket.panel}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "#ff8787", background: "#33181a",
          borderRadius: 999, padding: "4px 6px", lineHeight: 1,
        }}>
          {students.length}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={sendEmail}
            disabled={selectedCount === 0}
            style={{
              fontFamily: T.font, cursor: selectedCount === 0 ? "default" : "pointer",
              background: selectedCount === 0 ? "#e6e7ec" : "#0062f2",
              color: selectedCount === 0 ? T.textMuted : "#fff",
              border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 14, fontWeight: 600,
              boxShadow: selectedCount === 0 ? "none" : T.buttonShadow,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            ✉ Email <span style={{ fontSize: 12 }}>⌄</span>
          </button>
          <button
            onClick={onClose}
            title="Close"
            style={{
              fontFamily: T.font, cursor: "pointer", background: "none", border: "none",
              color: T.textMuted, fontSize: 18, padding: 4, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {bucketId === "low" && highActivityStudents.length > 0 && (
        <div style={{
          padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
          background: T.dangerFill, borderLeft: `3px solid ${T.danger}`,
          fontSize: 13, color: T.textLow, lineHeight: 1.5,
        }}>
          <strong style={{ color: T.danger }}>
            {highActivityStudents.length} student{highActivityStudents.length === 1 ? "" : "s"}
          </strong>
          {" "}completed most related activities but still show low proficiency — this suggests a{" "}
          <strong>conceptual gap</strong>, not a participation issue.
        </div>
      )}

      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 49, textAlign: "center" }}>
                <input type="checkbox" checked={allChecked} onChange={onToggleAll} style={{ accentColor: T.action, cursor: "pointer" }} />
              </th>
              <th style={th}>Student Name <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span></th>
              <th style={th}>Activities Attempted <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span></th>
              <th style={th}>Avg. Correctness</th>
              <th style={th}>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const highActivity = isHighActivityLowProficiency(s, objective.activitiesCount);
              const attemptPct = Math.round((s.attempted / objective.activitiesCount) * 100);
              return (
                <tr
                  key={s.id}
                  style={{
                    background: highActivity ? "#fff5f5" : i % 2 === 0 ? T.tableRow2 : T.rowStripe,
                    borderTop: `1px solid ${T.border}`,
                    boxShadow: highActivity ? `inset 3px 0 0 ${T.danger}` : "none",
                  }}
                >
                  <td style={{ ...td, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => onToggle(s.id)}
                      style={{ accentColor: T.action, cursor: "pointer" }}
                    />
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <StudentAvatar name={s.name} />
                      <a
                        href={studentProfileHref(s)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: T.action, fontWeight: 700, fontSize: 16,
                          textDecoration: "none",
                        }}
                      >
                        {s.name}
                      </a>
                      {highActivity && (
                        <span
                          title="Completed most activities but still low proficiency"
                          style={{
                            fontSize: 10, fontWeight: 700, color: T.danger,
                            background: T.dangerFill, borderRadius: 999, padding: "2px 8px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          High activity
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, color: T.textHigh }}>
                    <strong>{s.attempted} of {objective.activitiesCount}</strong>
                    <span style={{ color: T.textMuted, fontWeight: 400 }}> ({attemptPct}%)</span>
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: T.textHigh }}>
                    {s.correctness === null ? "—" : `${s.correctness}%`}
                  </td>
                  <td style={{ ...td, fontSize: 16, color: T.textLow }}>{s.lastActivity ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI recommendation panel (Figma expanded LO view)
// ---------------------------------------------------------------------------
function AIRecommendation({ objective, roster, onViewStruggling, onReviewActivity, onEmailStruggling }) {
  const [dismissed, setDismissed] = useState(false);
  const lowCount = roster.filter((s) => s.bucket === "low").length;
  const weakest = objective.activities
    ? objective.activities.reduce((min, a) => (a.correctness < min.correctness ? a : min))
    : null;
  const activityNum = weakest?.name.match(/Activity (\d+)/)?.[1] ?? "1";

  const recommendationText = objective.id === "lo-density"
    ? "Students are struggling with applying the density equation, but the data suggests this is a conceptual gap, not a participation issue. Most students with Low proficiency completed the related practice activities yet continue selecting incorrect formulas when rearranging the equation for mass, volume, or density."
    : `Students are struggling with ${objective.title.charAt(0).toLowerCase()}${objective.title.slice(1)}, but the data suggests this is a conceptual gap, not a participation issue. Most students with Low proficiency completed related activities yet continue to demonstrate gaps in understanding.`;

  if (dismissed) return null;

  const steps = [
    weakest && {
      icon: "📋",
      label: `Review Activity ${activityNum}`,
      desc: "Investigate the lowest-performing activity attached to this objective.",
      onClick: onReviewActivity,
    },
    lowCount > 0 && {
      icon: "👥",
      label: `View ${lowCount} Students`,
      desc: "See which students are struggling and compare their attempts.",
      onClick: onViewStruggling,
    },
    lowCount > 0 && {
      icon: "✉",
      label: "Email Students",
      desc: "Send a reminder encouraging another attempt before the upcoming assessment.",
      onClick: onEmailStruggling,
    },
  ].filter(Boolean);

  return (
    <div style={{
      background: T.tableHover, border: `1px solid ${T.action}`, borderLeft: `3px solid ${T.action}`,
      borderRadius: 6, padding: "13px 17px 13px 19px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>✦</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.textHigh, textTransform: "uppercase", flex: 1 }}>
          AI Recommendation
        </span>
        <button
          onClick={() => setDismissed(true)}
          title="Dismiss recommendation"
          style={{
            fontFamily: T.font, background: "none", border: "none", cursor: "pointer",
            color: T.textMuted, fontSize: 18, lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 16, color: T.textLow, lineHeight: 1.5, maxWidth: 1060 }}>
        {recommendationText}
      </p>
      <div style={{ paddingLeft: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textLow, textTransform: "uppercase", marginBottom: 12 }}>
          Recommended next steps
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((step) => (
            <div key={step.label}>
              <SecondaryActionButton icon={step.icon} onClick={step.onClick}>
                {step.label}
              </SecondaryActionButton>
              <p style={{ margin: "6px 0 0", fontSize: 16, color: T.textLow, lineHeight: 1.5 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-objectives table
// ---------------------------------------------------------------------------

function SubObjectivesTable({ subObjectives, onViewActivities, activitiesCount }) {
  const th = {
    textAlign: "left", fontSize: 16, fontWeight: 600, color: T.textHigh,
    padding: "10px", borderBottom: `1px solid ${T.border}`, background: "#fff",
    height: 50, verticalAlign: "middle",
  };
  const td = {
    padding: "10px", fontSize: 16, fontWeight: 500, color: T.textHigh,
    verticalAlign: "middle", lineHeight: 1.5, background: T.rowStripe,
    borderTop: `1px solid ${T.border}`,
  };

  if (subObjectives.length === 0) {
    return (
      <div style={{ fontSize: 14, color: T.textMuted, fontStyle: "italic", padding: "4px 2px" }}>
        This objective has no sub-objectives. Activity-level details are available in the Scored Activities tab.
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>
              Sub-objective <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span>
            </th>
            <th style={{ ...th, width: 200 }}>
              Student Proficiency <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span>
            </th>
            <th style={{ ...th, width: 220 }}>Proficiency Distribution</th>
            <th style={{ ...th, width: 200 }}>Related Activities</th>
          </tr>
        </thead>
        <tbody>
          {subObjectives.map((sub) => (
            <tr key={sub.title}>
              <td style={td}>{sub.title}</td>
              <td style={td}>
                <Chip label={sub.chip} scope="Class-level status for this sub-objective." variant="figma" />
              </td>
              <td style={td}>
                <MiniDistBar dist={sub.dist} width={157} height={25} variant="figma" />
              </td>
              <td style={{ ...td, textAlign: "center" }}>
                <button
                  onClick={onViewActivities}
                  style={{
                    fontFamily: T.font, cursor: "pointer", background: "#fff",
                    border: `1px solid ${T.buttonBorderBold}`, color: T.action, borderRadius: 6,
                    padding: "8px 16px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                    boxShadow: T.buttonShadow, display: "inline-flex", alignItems: "center", gap: 8,
                  }}
                >
                  View {activitiesCount} Activities <span style={{ fontSize: 14 }}>›</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Learning objective row (collapsed + expanded)
// ---------------------------------------------------------------------------

function ObjectiveRow({ objective, expanded, onToggleExpand, selectedBucket, onSelectBucket, onViewActivities, rowIndex = 0 }) {
  const roster = ROSTERS[objective.id];
  const [showHowEstimated, setShowHowEstimated] = useState(false);

  const bucketStudents = useMemo(
    () => (selectedBucket ? roster.filter((s) => s.bucket === selectedBucket) : []),
    [roster, selectedBucket],
  );

  const openActivities = () => {
    onViewActivities(objective.id);
  };

  const rowBg = rowIndex % 2 === 0 ? T.rowStripe : T.tableRow2;
  const thRow = {
    padding: "20px 10px", fontSize: 16, fontWeight: 500, color: T.textHigh,
    verticalAlign: "middle", lineHeight: 1.5,
  };

  return (
    <>
      {/* collapsed row */}
      <tr
        onClick={onToggleExpand}
        style={{
          background: expanded ? T.tableSelect : rowBg,
          borderTop: `1px solid ${T.border}`, cursor: "pointer",
        }}
      >
        <td style={{ ...thRow, width: 48, textAlign: "center", padding: "10px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: 3,
            background: expanded ? T.action : "transparent",
            color: expanded ? "#fff" : T.textMuted, fontSize: 12,
          }}>
            {expanded ? "⌃" : "⌄"}
          </span>
        </td>
        <td style={thRow}>
          {objective.title}
        </td>
        <td style={{ ...thRow, width: 200 }}>
          <Chip label={objective.chip} scope="Class-level status for this objective." variant="figma" />
        </td>
        <td style={{ ...thRow, width: 180 }}>
          <MiniDistBar dist={objective.dist} width={157} height={25} variant="figma" />
        </td>
        <td style={{ ...thRow, width: 180, textAlign: "center" }}>
          <button
            title="View the activities supporting this objective's sub-objectives"
            onClick={(e) => {
              e.stopPropagation();
              openActivities();
            }}
            style={{
              fontFamily: T.font, cursor: "pointer", background: "#fff",
              border: `1px solid ${T.buttonBorderBold}`, color: T.action, borderRadius: 6,
              padding: "8px 16px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
              boxShadow: T.buttonShadow, display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            View {objective.activitiesCount} Activities <span style={{ fontSize: 14 }}>›</span>
          </button>
        </td>
      </tr>

      {/* expanded view */}
      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0, borderTop: `1px solid ${T.border}`, background: T.tableHover }}>
            <div style={{
              padding: "24px 24px 24px 66px",
              display: "flex", flexDirection: "column", gap: 24,
            }}>
              {/* header + how-estimated disclosure */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: T.textHigh }}>
                    Estimated Learning: {TOTAL_STUDENTS} Students
                  </span>
                  <LinkButton onClick={() => setShowHowEstimated((v) => !v)} style={{ fontSize: 14, fontWeight: 700, color: T.link }}>
                    ⓘ How is proficiency estimated?
                  </LinkButton>
                </div>
                {showHowEstimated && <HowProficiencyEstimatedCard />}
              </div>

              <ProficiencyBuckets roster={roster} selectedBucket={selectedBucket} onSelectBucket={onSelectBucket} />

              {selectedBucket && (
                <StudentsPanel
                  key={selectedBucket}
                  objective={objective}
                  bucketId={selectedBucket}
                  students={bucketStudents}
                  onClose={() => onSelectBucket(null)}
                />
              )}

              <AIRecommendation
                objective={objective}
                roster={roster}
                onViewStruggling={() => onSelectBucket("low")}
                onReviewActivity={openActivities}
                onEmailStruggling={() => onSelectBucket("low")}
              />

              <SubObjectivesTable
                subObjectives={objective.subObjectives}
                onViewActivities={() => onViewActivities(objective.id)}
                activitiesCount={objective.activitiesCount}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Objective activity detail view (Figma node 108-4508)
// ---------------------------------------------------------------------------

function MultiInputAnalysis({ item }) {
  const weakest = item.inputs.reduce((min, f) => (f.correctPct < min.correctPct ? f : min), item.inputs[0]);
  const { multiInputSummary: s } = item;
  const neutralBar = "#b8bac4";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "All fields correct", value: `${s.allFieldsCorrect}%` },
          { label: "At least one correct", value: `${s.atLeastOneCorrect}%` },
          { label: "Avg fields correct", value: s.avgFieldsCorrect.toFixed(1) },
        ].map((stat) => (
          <div key={stat.label} style={{
            border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", minWidth: 130,
          }}>
            <div style={{ fontSize: 11, color: T.textMuted }}>{stat.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.textHigh }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase",
          letterSpacing: 0.5, marginBottom: 10,
        }}>
          Performance by input field
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {item.inputs.map((field) => {
            const isWeakest = field === weakest;
            return (
              <div key={field.label} style={{
                border: `1px solid ${T.border}`,
                borderLeft: isWeakest ? `3px solid ${T.danger}` : `1px solid ${T.border}`,
                borderRadius: 6, padding: "10px 14px", background: "#fff",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: T.textHigh, fontSize: 13 }}>{field.label}</span>
                  <span style={{ fontSize: 11.5, color: T.textMuted }}>
                    Expected: {field.expected}
                  </span>
                  {isWeakest && (
                    <span style={{ fontSize: 11, color: T.danger, marginLeft: "auto", fontWeight: 600 }}>
                      Focus here
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.rowStripe, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${field.correctPct}%`, borderRadius: 999,
                      background: isWeakest ? T.danger : neutralBar,
                    }} />
                  </div>
                  <span style={{
                    fontWeight: 600, fontSize: 13, width: 40, textAlign: "right",
                    color: isWeakest ? T.danger : T.textLow,
                  }}>
                    {field.correctPct}%
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: T.textMuted }}>
                  Common errors: {field.commonErrors.join(" · ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
        Multi-input questions are scored field by field.
        {isWeakActivity(item.correctPct) && (
          <> Review <strong style={{ color: T.danger, fontWeight: 600 }}>{weakest.label}</strong> first ({weakest.correctPct}% correct).</>
        )}
      </div>

      <div style={{ fontSize: 12, color: T.textMuted }}>
        {item.details.uniqueStudents} unique students · {item.details.avgAttempts} avg attempts · {item.details.skipped} skipped
      </div>
    </div>
  );
}

function AnswerDistribution({ answers, highlightWrong, variant = "default" }) {
  const total = answers.reduce((s, a) => s + a.count, 0) || 1;
  const topWrong = highlightWrong
    ? answers.filter((a) => !a.correct).reduce((max, a) => (!max || a.count > max.count ? a : max), null)
    : null;
  const neutralBar = "#ced1d9";
  const greenBar = "#218358";

  if (variant === "figma") {
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {answers.filter((a) => a.text !== "No answer / skipped").map((a, i) => {
          const emphasize = topWrong && a === topWrong;
          const isCorrect = a.correct;
          return (
            <div key={a.text}>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.textHigh, marginBottom: 5 }}>
                {labels[i]}.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  height: 24, width: Math.max(24, Math.round((a.count / total) * 112)),
                  background: isCorrect ? greenBar : emphasize ? T.danger : neutralBar,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: T.textLow }}>
                  {a.count} student{a.count === 1 ? "" : "s"}
                </span>
                {isCorrect && <span style={{ color: greenBar, fontSize: 14 }} aria-hidden>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {answers.map((a) => {
        const pct = Math.round((a.count / total) * 100);
        const emphasize = topWrong && a === topWrong;
        return (
          <div key={a.text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span style={{ flex: 1, color: emphasize ? T.textHigh : T.textLow, lineHeight: 1.4, fontWeight: emphasize ? 600 : 400 }}>
              {a.text}
              {a.correct && <span style={{ color: T.textMuted, fontWeight: 400 }}> · correct</span>}
            </span>
            <span style={{ width: 120, height: 6, borderRadius: 999, background: T.rowStripe, overflow: "hidden" }}>
              <span style={{
                display: "block", height: "100%", width: `${pct}%`, borderRadius: 999,
                background: emphasize ? T.danger : neutralBar,
              }} />
            </span>
            <span style={{
              width: 36, textAlign: "right", fontWeight: 600,
              color: emphasize ? T.danger : T.textMuted,
            }}>
              {pct}%
            </span>
            <span style={{ width: 48, textAlign: "right", color: T.textMuted, fontSize: 11.5 }}>
              n={a.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryBar({ label, pct, width = 251 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: T.textHigh, whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ position: "relative", width, height: 24, background: "#ced1d9" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: T.danger,
        }} />
      </div>
      <span style={{ fontSize: 16, fontWeight: 600, color: T.textLow }}>{pct}%</span>
    </div>
  );
}

function QuestionExpandedDetail({ item }) {
  const [tab, setTab] = useState("responses");
  const weak = isWeakActivity(item.correctPct);
  const isMultiInput = item.type === "multi-input";
  const firstTry = item.firstTryPct ?? item.correctPct;
  const eventual = item.eventualPct ?? Math.min(100, item.correctPct + 18);
  const tabs = ["Student Responses", "Answer Key", "Hints", "Explanation", "Dynamic Variables"];

  return (
    <div style={{ background: T.tableHover, padding: "16px 24px 20px 48px" }}>
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
        {tabs.map((t) => {
          const tabId = t === "Student Responses" ? "responses" : t.toLowerCase().replace(/ /g, "-");
          const isActive = tab === tabId;
          return (
            <button
              key={t}
              onClick={(e) => { e.stopPropagation(); setTab(tabId); }}
              style={{
                fontFamily: T.font, cursor: "pointer", background: T.tableHover, border: "none",
                padding: "16px 12px", fontSize: 14, fontWeight: isActive ? 600 : 400, color: T.textHigh,
                borderBottom: isActive ? "2px solid #0080ff" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === "responses" ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.textHigh, marginBottom: 16 }}>
            {item.details.uniqueStudents} Students Responded
          </div>
          {isMultiInput ? (
            <MultiInputAnalysis item={item} />
          ) : (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
              border: `1px solid ${T.border}`, borderRadius: 3, background: "#fff", padding: 20,
              marginBottom: 16,
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.textHigh, marginBottom: 12 }}>
                  First Attempt
                </div>
                <AnswerDistribution answers={item.answers} highlightWrong={weak} variant="figma" />
              </div>
              <div style={{
                border: `1px solid ${T.border}`, borderRadius: 3, padding: 16, background: "#fafbfc",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textHigh, marginBottom: 8 }}>
                  {item.poolId}:
                </div>
                <div style={{ fontSize: 16, color: T.textLow, lineHeight: 1.5, marginBottom: 12 }}>
                  {item.stem}
                </div>
                {item.answers.filter((a) => a.text !== "No answer / skipped").map((a, i) => (
                  <div key={a.text} style={{ fontSize: 14, color: T.textLow, marginBottom: 6, lineHeight: 1.45 }}>
                    {String.fromCharCode(65 + i)}. {a.text}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isMultiInput && (
            <div style={{
              border: `1px solid ${T.border}`, borderRadius: 3, background: "#fff",
              padding: "20px 23px", display: "flex", gap: 107, flexWrap: "wrap",
            }}>
              <SummaryBar label="First Try Correct:" pct={firstTry} />
              <SummaryBar label="Eventually Correct" pct={eventual} />
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 14, color: T.textMuted, fontStyle: "italic", padding: "8px 0" }}>
          {tab.replace(/-/g, " ")} is not available in this prototype.
        </div>
      )}
    </div>
  );
}

function ActivityQuestionRow({ item, index, open, onToggle }) {
  const weak = isWeakActivity(item.correctPct);
  const td = { padding: "10px", fontSize: 16, color: T.textLow, verticalAlign: "middle" };
  const rowBg = index % 2 === 0 ? T.tableRow2 : T.rowStripe;

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          background: open ? T.tableSelect : rowBg,
          borderTop: `1px solid ${T.border}`, cursor: "pointer",
        }}
      >
        <td style={{ ...td, width: 51, textAlign: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: 3,
            background: open ? T.action : "transparent",
            color: open ? "#fff" : T.textMuted, fontSize: 12,
          }}>
            {open ? "⌃" : "⌄"}
          </span>
        </td>
        <td style={td}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textHigh, marginBottom: 4 }}>
            {item.poolId}:
          </div>
          <div style={{ fontWeight: 400, color: T.textHigh, lineHeight: 1.5 }}>{item.stem}</div>
        </td>
        <td style={{ ...td, width: 171, fontWeight: 700, fontSize: 14, color: T.textHigh }}>
          {item.attempts}
        </td>
        <td style={{ ...td, width: 196, fontWeight: 700, fontSize: 14, color: weak ? "#b60202" : T.textHigh }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {item.correctPct}%
            {weak && <span style={{ fontSize: 14 }} aria-hidden title="Needs attention">⚠</span>}
          </span>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} style={{ padding: 0, borderTop: `1px solid ${T.border}` }}>
            <QuestionExpandedDetail item={item} />
          </td>
        </tr>
      )}
    </>
  );
}

function ObjectiveActivitiesView({ objective, onBack }) {
  const items = getActivityItems(objective);
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [attemptsFilter, setAttemptsFilter] = useState("all");
  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleItems = items
    .filter((i) => {
      if (search && !i.stem.toLowerCase().includes(search.toLowerCase())
        && !i.poolId.toLowerCase().includes(search.toLowerCase())) return false;
      if (scoreFilter === "weak" && !isWeakActivity(i.correctPct)) return false;
      if (attemptsFilter === "high" && i.attempts < 50) return false;
      if (attemptsFilter === "low" && i.attempts >= 50) return false;
      return true;
    })
    .sort((a, b) => scoreFilter === "weak" ? a.correctPct - b.correctPct : a.id - b.id);

  const th = {
    textAlign: "left", fontSize: 16, fontWeight: 600, color: T.textHigh,
    padding: "10px", borderBottom: `1px solid ${T.border}`, background: "#fff",
    height: 50, verticalAlign: "middle",
  };

  const filterSelect = (value, onChange, label) => (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      border: `1px solid ${T.border}`, borderRadius: 3, padding: "8px 10px", height: 35,
    }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: T.font, fontSize: 16, fontWeight: 600, padding: 0,
          border: "none", color: T.textHigh, background: "transparent", outline: "none",
          cursor: "pointer", appearance: "none", paddingRight: 18,
        }}
      >
        {label}
      </select>
      <span style={{ fontSize: 10, color: T.textMuted, marginLeft: -16 }}>⌄</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1325, margin: "0 auto", padding: "16px 24px 64px" }}>
      <LinkButton
        onClick={onBack}
        style={{ fontSize: 14, fontWeight: 600, color: "#373a44", marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        ‹ Back to Learning Objectives
      </LinkButton>

      <h1 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 500, color: T.textHigh, lineHeight: 1.33, maxWidth: 1100 }}>
        {objective.title}
      </h1>

      {items.length > 0 && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 12,
          background: "#fff", border: `1px solid ${T.border}`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.10)", padding: "0 10px",
        }}>
          <div style={{ padding: "10px 0" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search questions"
              style={{
                fontFamily: T.font, fontSize: 14, padding: "8px 12px 8px 36px", width: 224,
                border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", color: T.textLow,
                background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23757682'%3E%3Cpath d='M11.7 10.3l3.3 3.3-1.4 1.4-3.3-3.3a5 5 0 1 1 1.4-1.4zM6 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'/%3E%3C/svg%3E") no-repeat 10px center`,
              }}
            />
          </div>
          {filterSelect(attemptsFilter, setAttemptsFilter, (
            <>
              <option value="all">Attempts</option>
              <option value="high">50+ attempts</option>
              <option value="low">Under 50 attempts</option>
            </>
          ))}
          {filterSelect(scoreFilter, setScoreFilter, (
            <>
              <option value="all">Score</option>
              <option value="weak">Needs attention (&lt;65%)</option>
            </>
          ))}
          <button
            onClick={() => { setSearch(""); setScoreFilter("all"); setAttemptsFilter("all"); }}
            style={{
              fontFamily: T.font, fontSize: 14, color: T.textHigh, background: "none",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              padding: "10px",
            }}
          >
            <span style={{ fontSize: 16 }} aria-hidden>🗑</span> Clear All Filters
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ fontSize: 14, color: T.textMuted, fontStyle: "italic", background: "#fff", padding: 24 }}>
          Activity-level details for this objective are available in the Scored Activities tab.
        </div>
      ) : visibleItems.length === 0 ? (
        <div style={{ fontSize: 14, color: T.textMuted, fontStyle: "italic", padding: 16, background: "#fff" }}>
          No questions match the current filters.
        </div>
      ) : (
        <div style={{ background: "#fff", padding: "32px 20px", border: `1px solid ${T.border}` }}>
          <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 51 }} />
                  <th style={th}>Question Stem <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span></th>
                  <th style={{ ...th, width: 171 }}>Attempts <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span></th>
                  <th style={{ ...th, width: 196 }}>% Correct <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item, i) => (
                  <ActivityQuestionRow
                    key={item.id}
                    item={item}
                    index={i}
                    open={expanded.has(item.id)}
                    onToggle={() => toggle(item.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Learning Objectives card
// ---------------------------------------------------------------------------

function LearningObjectivesCard({ onViewActivities }) {
  const [search, setSearch] = useState("");
  const [proficiencyFilter, setProficiencyFilter] = useState("All");
  const [expandedIds, setExpandedIds] = useState(new Set(["lo-density"]));
  // Per-objective selected proficiency bucket — lifted so overview cards can drive it.
  const [bucketSelections, setBucketSelections] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectBucketFor = (id, bucket) => {
    setBucketSelections((prev) => ({ ...prev, [id]: bucket }));
  };

  // Overview cards are filters: each narrows the objectives below and, where it
  // makes sense, drills straight into the relevant student group.
  const [activeCard, setActiveCard] = useState(null);
  const CARD_FILTERS = {
    objectives: { filter: "Needs Attention" },
    subobjectives: { filter: "Needs Attention", lo: "lo-density" },
  };
  const toggleCard = (cardId) => {
    if (activeCard === cardId) {
      setActiveCard(null);
      setProficiencyFilter("All");
      setBucketSelections({});
      return;
    }
    const c = CARD_FILTERS[cardId];
    setActiveCard(cardId);
    setProficiencyFilter(c.filter);
    setBucketSelections(c.lo && c.bucket ? { [c.lo]: c.bucket } : {});
    if (c.lo) setExpandedIds((prev) => new Set(prev).add(c.lo));
  };

  const rows = OBJECTIVES
    .filter((lo) => {
      if (search && !lo.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (proficiencyFilter !== "All" && lo.chip !== proficiencyFilter) return false;
      return true;
    })
    .sort((a, b) => PRIORITY[a.chip] - PRIORITY[b.chip]);

  const lowOutcomes = OBJECTIVES.filter((lo) => lo.chip === "Needs Attention").length;
  const lowSubObjectives = OBJECTIVES.reduce(
    (sum, lo) => sum + lo.subObjectives.filter((s) => s.chip === "Needs Attention").length,
    0,
  );

  const th = {
    textAlign: "left", fontSize: 16, fontWeight: 600, color: T.textHigh,
    padding: "10px", borderBottom: `1px solid ${T.border}`, background: "#fff",
    height: 50, verticalAlign: "middle",
  };

  const highlightCard = (active) => ({
    border: active ? `1.5px solid ${T.action}` : `1px solid ${T.highlightCardBorder}`,
    background: active ? T.tableSelect : T.highlightCardBg,
    borderRadius: 16, padding: 24, width: 322, minHeight: 128, cursor: "pointer",
    boxShadow: "0 2px 5px rgba(0, 50, 99, 0.10)",
  });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px 64px" }}>
      <div style={{ background: "#fff", padding: "32px 20px" }}>
        {/* header + highlight cards + download */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 16, gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: T.textHigh }}>
              Learning Objectives
            </h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div
                style={highlightCard(activeCard === "objectives")}
                onClick={() => toggleCard("objectives")}
                title="Filter the table to learning objectives with low proficiency"
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: T.highlightCardText, lineHeight: 1.5 }}>
                  Low Proficiency Learning Objectives
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: T.highlightCardText, lineHeight: 1.1 }}>
                    {lowOutcomes}
                  </span>
                  <span style={{ fontSize: 14, color: T.highlightCardSubtext, paddingBottom: 8 }}>
                    Learning objective{lowOutcomes === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div
                style={highlightCard(activeCard === "subobjectives")}
                onClick={() => toggleCard("subobjectives")}
                title="Filter to objectives with low-proficiency sub-objectives"
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: T.highlightCardText, lineHeight: 1.5 }}>
                  Low Proficiency Sub-Objectives
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: T.highlightCardText, lineHeight: 1.1 }}>
                    {lowSubObjectives}
                  </span>
                  <span style={{ fontSize: 14, color: T.highlightCardSubtext, paddingBottom: 8 }}>
                    Sub-objectives
                  </span>
                </div>
              </div>
            </div>
          </div>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              color: T.action, fontSize: 14, fontWeight: 700, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 4,
            }}
          >
            Download CSV <span style={{ fontSize: 16 }}>⬇</span>
          </a>
        </div>

        {/* instructional banner */}
        <div style={{
          border: `1px solid ${T.action}`, borderLeft: `3px solid ${T.action}`,
          background: T.tableHover, borderRadius: 6, padding: "9px 15px 9px 17px", marginBottom: 12,
          fontSize: 12.5, color: T.textHigh, lineHeight: 1.6,
        }}>
          <strong>Use learning objectives to identify:</strong>
          <span style={{ fontWeight: 400, color: T.textLow }}>
            {" "}Which concepts require additional attention, which students might need extra support, and what actions you can take to improve learning outcomes.
          </span>
        </div>

        {/* filter bar */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 12,
          background: "#fff", border: `1px solid ${T.border}`, borderRadius: 3,
          padding: "0 10px", boxShadow: "0 2px 6px rgba(0,0,0,0.10)",
        }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search learning objectives"
              style={{
                fontFamily: T.font, fontSize: 14, padding: "8px 12px 8px 36px", width: 224,
                border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", color: T.textLow,
                background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23757682'%3E%3Cpath d='M11.7 10.3l3.3 3.3-1.4 1.4-3.3-3.3a5 5 0 1 1 1.4-1.4zM6 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'/%3E%3C/svg%3E") no-repeat 10px center`,
              }}
            />
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            border: `1px solid ${T.border}`, borderRadius: 3, padding: "8px 10px", height: 35,
          }}>
            <select
              value={proficiencyFilter}
              onChange={(e) => { setProficiencyFilter(e.target.value); setActiveCard(null); }}
              style={{
                fontFamily: T.font, fontSize: 16, fontWeight: 600, padding: 0,
                border: "none", color: T.textHigh, background: "transparent", outline: "none",
                cursor: "pointer", appearance: "none", paddingRight: 20,
              }}
            >
              <option value="All">Proficiency</option>
              <option value="Needs Attention">Needs Attention</option>
              <option value="Watch">Watch</option>
              <option value="On Track">On Track</option>
              <option value="Not enough data">Not enough data</option>
            </select>
            <span style={{ fontSize: 10, color: T.textMuted, marginLeft: -16 }}>⌄</span>
          </div>
          <button
            onClick={() => { setSearch(""); setProficiencyFilter("All"); setActiveCard(null); setBucketSelections({}); }}
            style={{
              fontFamily: T.font, fontSize: 14, color: T.textHigh, background: "none",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              padding: "10px",
            }}
          >
            <span style={{ fontSize: 16 }} aria-hidden>🗑</span> Clear All Filters
          </button>
        </div>

        {/* objectives table */}
        <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 48 }} />
                <th style={th}>
                  Learning Objective <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span>
                </th>
                <th style={{ ...th, width: 220 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: T.textMuted, fontSize: 14 }} aria-hidden>ⓘ</span>
                    Student Proficiency <span style={{ fontSize: 12, fontWeight: 400 }}>⌄</span>
                  </span>
                </th>
                <th style={{ ...th, width: 200 }}>Proficiency Distribution</th>
                <th style={{ ...th, width: 200, paddingLeft: 25 }}>Related Activities</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 16, fontSize: 13, color: T.textMuted, fontStyle: "italic" }}>
                    No objectives match the current filters.
                  </td>
                </tr>
              )}
              {rows.map((lo, i) => (
                <ObjectiveRow
                  key={lo.id}
                  objective={lo}
                  rowIndex={i}
                  expanded={expandedIds.has(lo.id)}
                  onToggleExpand={() => toggleExpand(lo.id)}
                  selectedBucket={bucketSelections[lo.id] ?? null}
                  onSelectBucket={(b) => selectBucketFor(lo.id, b)}
                  onViewActivities={onViewActivities}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [activityObjectiveId, setActivityObjectiveId] = useState(null);
  const activityObjective = OBJECTIVES.find((o) => o.id === activityObjectiveId);

  return (
    <div style={{ fontFamily: T.font, background: T.bgPrimary, minHeight: "100vh", color: T.textHigh }}>
      <TopNav />
      <InsightsTabs />
      {activityObjective ? (
        <ObjectiveActivitiesView
          objective={activityObjective}
          onBack={() => setActivityObjectiveId(null)}
        />
      ) : (
        <>
          <ModulePager />
          <LearningObjectivesCard onViewActivities={setActivityObjectiveId} />
        </>
      )}
    </div>
  );
}
