import { useEffect, useId, useMemo, useState } from "react";

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

const ICONS = {
  trash: "/icons/trash.png",
  mail: "/icons/mail-up.png",
  warning: "/icons/warning.png",
  practice: "/icons/20px/practice.png",
  users: "/icons/20px/users.png",
  chevronDown: "/icons/chevron-down.png",
};

function AppIcon({ src, size = 16, alt = "" }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden={!alt}
    />
  );
}

function ChevronIcon({ direction = "down", size = 12, inverted = false, style }) {
  return (
    <img
      src={ICONS.chevronDown}
      alt=""
      width={size}
      height={size}
      aria-hidden
      style={{
        display: "block",
        flexShrink: 0,
        transform: direction === "up" ? "rotate(180deg)" : undefined,
        filter: inverted ? "brightness(0) invert(1)" : undefined,
        ...style,
      }}
    />
  );
}

const BUCKET_CHIP_KEY = {
  none: "Not enough data",
  low: "Needs Attention",
  medium: "Watch",
  high: "On Track",
};

// High / Medium / Low styling for confidence — icon + text (no pill background).
const HML_CONFIDENCE = {
  high: { color: "#000", icon: "up" },
  medium: { color: "#000", icon: null },
  low: { color: "#45464c", icon: "down" },
};

// Figma dashboard table uses Low / Medium / High labels on proficiency pills.
const CHIP_FIGMA = {
  "Needs Attention": { label: "Low", bg: T.dangerFill, color: "#b60202", warn: true, chevron: false },
  "Watch": { label: "Medium", bg: "#ffecde", color: "#91450e", warn: false, chevron: false },
  "On Track": { label: "High", bg: "#e7fcf3", color: "#175a3d", warn: false, chevron: false },
  "Not enough data": { label: "Not enough data", bg: "#ced1d9", color: "#000", warn: false, chevron: false },
};

const DIST_BAR_COLORS = ["#c2c2c2", "#ce2c31", "#bf5b13", "#218358"];

// Expanded-detail bucket card labels (Figma expanded LO view).
const BUCKET_CARD_LABELS = {
  none: "Not Enough Data",
  low: "Low Proficiency",
  medium: "Medium Proficiency",
  high: "High Proficiency",
};

const CONFIDENCE_LEVELS = {
  high: {
    label: "High confidence",
    short: "High",
    desc: "Based on substantial activity evidence across linked activities. You can trust this proficiency estimate when deciding who needs support.",
    ...HML_CONFIDENCE.high,
  },
  medium: {
    label: "Medium confidence",
    short: "Medium",
    desc: "Based on moderate activity evidence. The estimate may change as more students complete linked activities.",
    ...HML_CONFIDENCE.medium,
  },
  low: {
    label: "Low confidence",
    short: "Low",
    desc: "Based on limited activity evidence. Treat the proficiency level as preliminary — encourage more activity before acting.",
    ...HML_CONFIDENCE.low,
  },
};

const CONFIDENCE_FILTER_HINTS = {
  high: "Substantial activity evidence — trustworthy estimate",
  medium: "Moderate evidence — may shift with more activity",
  low: "Limited evidence — treat as preliminary",
};

function ProficiencyIntro() {
  return (
    <p style={{
      margin: "0 0 20px", width: "100%", fontSize: 13, color: T.textMuted,
      lineHeight: 1.6,
    }}>
      Use learning objectives to identify which concepts require additional attention, which students might need extra support, and what actions you can take to improve learning outcomes.
    </p>
  );
}

// Proficiency buckets — presentation labels only; underlying buckets (and the
// proficiency calculation) are unchanged. Colors match the Torus purple ramp.
const BUCKETS = [
  {
    id: "none", label: "Not Enough Data", panel: "Students with Not Enough Data", dot: "#9b9ea8", seg: "#caccd3",
    desc: "Too few linked activities to estimate proficiency for this objective.",
  },
  {
    id: "low", label: "Needs Attention", panel: "Students with Low Estimated Proficiency", dot: "#ce2c31", seg: "#f0a6ab",
    desc: "Students unlikely to demonstrate this objective without support — open the student list to investigate.",
  },
  {
    id: "medium", label: "Watch", panel: "Students to Watch", dot: "#d97706", seg: "#f5c97e",
    desc: "Developing — may need more practice before assessment.",
  },
  {
    id: "high", label: "On Track", panel: "Students On Track", dot: "#1d7a46", seg: "#8ecfa8",
    desc: "Likely demonstrating this objective across linked activities.",
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

// Maps course activity numbers to question rows on the activity detail view.
const ACTIVITY_NUMBER_TO_QUESTION_ID = {
  "lo-density": {
    1: 1, 2: 2, 3: 4, 4: 3, 5: 5, 6: 6, 7: 7, 8: 8, 9: 10,
  },
};

function questionIdForActivityReview(objective, activityNum) {
  const num = Number(activityNum);
  if (!num) return null;
  const items = getActivityItems(objective);
  if (!items.length) return null;

  const mapped = ACTIVITY_NUMBER_TO_QUESTION_ID[objective.id]?.[num];
  if (mapped != null && items.some((i) => i.id === mapped)) return mapped;
  if (items.some((i) => i.id === num)) return num;

  return [...items].sort((a, b) => a.correctPct - b.correctPct)[0]?.id ?? null;
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
    confidence: "high",
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
        chip: "Needs Attention", confidence: "medium", dist: [4, 12, 8, 6],
        relatedActivities: [
          { name: "Rate Law Practice", type: "Practice", correctness: 42, completion: 61 },
          { name: "Reaction Mechanism Quiz", type: "Quiz", correctness: 51, completion: 72 },
          { name: "Mechanism Steps Drill", type: "Practice", correctness: 55, completion: 68 },
        ],
      },
      {
        title: "Describe the effects of chemical nature, physical state, temperature, concentration, and catalysis on reaction rates.",
        chip: "Needs Attention", confidence: "medium", dist: [3, 13, 8, 6],
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
    confidence: "low",
    dist: [20, 4, 3, 3],
    activitiesCount: 1,
    activities: null,
    subObjectives: [],
  },
  {
    id: "lo-sigfigs",
    title: "Apply the multiplication and division significant figure rule.",
    chip: "On Track",
    confidence: "high",
    dist: [2, 3, 9, 16],
    activitiesCount: 14,
    activities: null,
    subObjectives: [],
  },
  {
    id: "lo-molarity-2",
    title: "Apply the molarity equation to calculate the concentration of a solution.",
    chip: "Watch",
    confidence: "medium",
    dist: [3, 6, 12, 9],
    activitiesCount: 10,
    activities: null,
    subObjectives: [],
  },
  {
    id: "lo-molarity-3",
    title: "Apply the molarity equation to calculate the concentration of a solution.",
    chip: "Watch",
    confidence: "low",
    dist: [2, 7, 13, 8],
    activitiesCount: 3,
    activities: null,
    subObjectives: [],
  },
  {
    id: "lo-scatter-demo",
    title: "Determine reaction order and rate constants from experimental concentration data.",
    chip: "Needs Attention",
    confidence: "medium",
    distributionChart: "scatter",
    dist: [2, 8, 11, 9],
    activitiesCount: 8,
    activities: [
      { name: "Activity 1: Rate Law Introduction", type: "Learn", completion: 88, correctness: 74 },
      { name: "Activity 2: Concentration vs. Rate Lab", type: "Lab", completion: 76, correctness: 58 },
      { name: "Activity 3: Integrated Rate Laws", type: "Practice", completion: 71, correctness: 52 },
      { name: "Activity 4: Order Determination Drill", type: "Practice", completion: 65, correctness: 44 },
      { name: "Activity 5: Rate Constant Calculations", type: "Practice", completion: 58, correctness: 41 },
      { name: "Activity 6: Experimental Data Analysis", type: "Lab", completion: 54, correctness: 38 },
      { name: "Activity 7: Kinetics Checkpoint", type: "Quiz", completion: 49, correctness: 46 },
      { name: "Activity 8: Cumulative Kinetics Review", type: "Assessment", completion: 42, correctness: 43 },
    ],
    subObjectives: [],
  },
  {
    id: "lo-pie-demo",
    title: "Interpret rate versus concentration graphs to determine reaction order.",
    chip: "Needs Attention",
    confidence: "medium",
    distributionChart: "pie",
    dist: [3, 7, 12, 8],
    activitiesCount: 7,
    activities: [
      { name: "Activity 1: Rate vs. Concentration Graphs", type: "Learn", completion: 82, correctness: 68 },
      { name: "Activity 2: Zero-Order Identification", type: "Practice", completion: 74, correctness: 55 },
      { name: "Activity 3: First-Order Graph Analysis", type: "Practice", completion: 68, correctness: 49 },
      { name: "Activity 4: Second-Order Patterns", type: "Practice", completion: 61, correctness: 42 },
      { name: "Activity 5: Mixed Order Drill", type: "Practice", completion: 55, correctness: 39 },
      { name: "Activity 6: Graph Interpretation Quiz", type: "Quiz", completion: 48, correctness: 44 },
      { name: "Activity 7: Reaction Order Review", type: "Assessment", completion: 41, correctness: 40 },
    ],
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

function confidenceForStudent(bucket, attempted, activitiesCount, loIndex) {
  if (bucket === "none") return "low";
  if (activitiesCount <= 1) return attempted >= 1 ? "medium" : "low";
  if (loIndex === 0 && bucket === "low") {
    if (attempted >= 6) return "high";
    if (attempted >= 3) return "medium";
    return "low";
  }
  const ratio = attempted / activitiesCount;
  if (ratio >= 0.65) return "high";
  if (ratio >= 0.35) return "medium";
  return "low";
}

const SCATTER_THRESHOLD = 50;

const SCATTER_QUADRANTS = [
  {
    id: "tl",
    label: "Working hard, struggling",
    hint: "Low proficiency · High activity completion",
    panel: "Students Working Hard but Struggling",
    desc: "Students are actively completing the associated learning activities but are still unlikely to demonstrate this learning objective. Review common misconceptions, instructional materials, or provide additional support.",
    bg: "rgba(0, 0, 0, 0.02)",
    dot: "#ce2c31",
    pieColor: "#ce2c31",
    badgeBg: "#feebed",
    badgeColor: "#b60202",
    priority: 1,
  },
  {
    id: "bl",
    label: "Low participation",
    hint: "Low proficiency · Low activity completion",
    panel: "Students with Low Participation",
    desc: "Students have completed few associated learning activities, making it difficult to determine whether low proficiency reflects a learning gap or limited engagement. Encourage students to complete more practice before intervening.",
    bg: "rgba(0, 0, 0, 0.04)",
    dot: "#bf5b13",
    pieColor: "#bf5b13",
    badgeBg: "#ffecde",
    badgeColor: "#91450e",
    priority: 2,
  },
  {
    id: "tr",
    label: "Thriving",
    hint: "High proficiency · High activity completion",
    panel: "Students Thriving",
    desc: "Students are completing the associated learning activities and are likely to demonstrate this learning objective. Continue reinforcing their progress.",
    bg: "rgba(0, 0, 0, 0.02)",
    dot: "#218358",
    pieColor: "#218358",
    badgeBg: "#e7fcf3",
    badgeColor: "#175a3d",
    priority: 4,
  },
  {
    id: "br",
    label: "Succeeding with less practice",
    hint: "High proficiency · Low activity completion",
    panel: "Students Succeeding with Less Practice",
    desc: "Students are likely to demonstrate this learning objective despite completing relatively few associated learning activities. Monitor for consistency as they continue through the course.",
    bg: "rgba(0, 0, 0, 0.04)",
    dot: "#1d7a46",
    pieColor: "#1d7a46",
    badgeBg: "#e6f6ec",
    badgeColor: "#1d7a46",
    priority: 3,
  },
];

function usesDistributionChart(objective) {
  return objective.distributionChart === "scatter" || objective.distributionChart === "pie";
}

function scatterQuadrantFor(proficiencyScore, completionPct) {
  const highProf = proficiencyScore >= SCATTER_THRESHOLD;
  const highComp = completionPct >= SCATTER_THRESHOLD;
  if (highComp && highProf) return "tr";
  if (highComp && !highProf) return "tl";
  if (!highComp && !highProf) return "bl";
  return "br";
}

function buildDistRoster(objective, loIndex) {
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
        confidence: confidenceForStudent(bucket, attempted, n, loIndex),
      });
      cursor++;
    }
  });
  return roster;
}

function scatterCompletionFor(proficiencyScore, index) {
  const highProf = proficiencyScore >= SCATTER_THRESHOLD;
  const slot = index % 6;
  if (!highProf) {
    const highActivity = slot % 2 === 0;
    return highActivity
      ? SCATTER_THRESHOLD + 6 + ((index * 11) % 38)
      : Math.max(8, SCATTER_THRESHOLD - 6 - ((index * 7) % 38));
  }
  const highActivity = slot % 3 !== 1;
  return highActivity
    ? SCATTER_THRESHOLD + 8 + ((index * 9) % 32)
    : Math.max(10, SCATTER_THRESHOLD - 8 - ((index * 5) % 36));
}

function buildScatterRoster(objective, loIndex) {
  const n = objective.activitiesCount;
  return buildDistRoster(objective, loIndex).map((student, index) => {
    const completionPct = scatterCompletionFor(student.proficiencyScore, index);
    const attempted = n > 0 ? Math.max(0, Math.min(n, Math.round((completionPct / 100) * n))) : 0;
    const lastActivity = attempted === 0
      ? null
      : student.lastActivity ?? ["Today", "2 days ago", "4 days ago", "1 week ago"][index % 4];
    return {
      ...student,
      attempted,
      completionPct,
      lastActivity,
      scatterQuadrant: scatterQuadrantFor(student.proficiencyScore, completionPct),
      confidence: confidenceForStudent(student.bucket, attempted, n, loIndex),
    };
  });
}

function buildRoster(objective, loIndex) {
  if (usesDistributionChart(objective)) return buildScatterRoster(objective, loIndex);
  return buildDistRoster(objective, loIndex);
}

const ROSTERS = Object.fromEntries(OBJECTIVES.map((lo, i) => [lo.id, buildRoster(lo, i)]));

const TOTAL_STUDENTS = 30;
const PRIORITY = { "Needs Attention": 0, "Not enough data": 1, "Watch": 2, "On Track": 3 };

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

function InfoTip({ text, children, ariaLabel }) {
  const tipId = useId();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setVisible(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        tabIndex={0}
        aria-label={ariaLabel ?? text}
        aria-describedby={visible ? tipId : undefined}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{ display: "inline-flex", outline: "none", borderRadius: 999 }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setVisible(false);
        }}
      >
        {children}
      </span>
      {visible && (
        <span
          id={tipId}
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 20,
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            minWidth: 200,
            maxWidth: 280,
            padding: "8px 12px",
            background: T.textHigh,
            color: "#fff",
            fontSize: 12.5,
            lineHeight: 1.45,
            borderRadius: 6,
            boxShadow: T.shadow,
            pointerEvents: "none",
            whiteSpace: "normal",
            textAlign: "left",
            fontWeight: 400,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function Chip({ label, scope, variant = "default" }) {
  const s = variant === "figma" ? CHIP_FIGMA[label] : CHIP_STYLES[label];
  const displayLabel = variant === "figma" ? s.label : label;
  const tip = scope ? `${scope} ${CHIP_DESCRIPTIONS[label]}` : CHIP_DESCRIPTIONS[label];
  const pill = (
    <span
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
        <AppIcon src={ICONS.warning} size={16} />
      )}
      {displayLabel}
      {variant === "figma" && s.chevron && (
        <ChevronIcon size={10} style={{ opacity: 0.7 }} />
      )}
    </span>
  );
  return (
    <InfoTip text={tip} ariaLabel={tip}>
      {pill}
    </InfoTip>
  );
}

function ConfidenceBadge({ level, variant = "default", showSeparateNote = false }) {
  const c = CONFIDENCE_LEVELS[level];
  if (!c) return null;
  const compact = variant === "compact";
  const tip = showSeparateNote ? `${c.desc} Separate from proficiency level.` : c.desc;
  const badge = (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 14,
        fontWeight: 600,
        color: c.color,
        whiteSpace: "nowrap",
        cursor: "help",
      }}
    >
      {c.icon === "up" && <ChevronIcon direction="up" size={10} />}
      {c.icon === "down" && <ChevronIcon direction="down" size={10} />}
      {compact ? c.short : c.label}
    </span>
  );
  return (
    <InfoTip text={tip} ariaLabel={`${c.label}: ${c.desc}`}>
      {badge}
    </InfoTip>
  );
}

function ProficiencyCell({ chipLabel, confidence, scope }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
      <Chip label={chipLabel} scope={scope} variant="figma" />
      <ConfidenceBadge level={confidence} variant="compact" />
    </div>
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
        Module 2: Reaction Rates <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle" }} />
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

function SecondaryActionButton({ children, onClick, iconSrc }) {
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
      {iconSrc && <AppIcon src={iconSrc} size={20} />}
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
                  <title>{`${d.student.name}: ${d.score}% proficiency · ${CONFIDENCE_LEVELS[d.student.confidence]?.short ?? ""} confidence`}</title>
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

function scatterJitter(id, axis) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i) + axis * 7) % 997;
  return (h % 100) / 100 - 0.5;
}

const SCATTER_CHART_WIDTH = 640;
const SCATTER_CHART_HEIGHT = 636;

function ScatterPlotLegend() {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "8px 16px",
      fontSize: 12, color: T.textMuted,
    }}>
      {BUCKETS.map((b) => (
        <span key={b.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: b.dot, flexShrink: 0 }} />
          {BUCKET_CARD_LABELS[b.id]}
        </span>
      ))}
    </div>
  );
}

function StudentDistributionPlot({ roster, selectedQuadrant, onSelectQuadrant, chartOnly = false }) {
  const W = SCATTER_CHART_WIDTH;
  const padL = 52;
  const padR = 24;
  const padT = 24;
  const padB = 48;
  const plotW = W - padL - padR;
  const plotH = plotW;
  const plotBottom = padT + plotH;
  const H = plotBottom + padB;
  const midX = padL + plotW * (SCATTER_THRESHOLD / 100);
  const midY = padT + plotH * (1 - SCATTER_THRESHOLD / 100);
  const DOT_R = 4.5;
  const GRID_THIRDS = [100 / 3, (100 * 2) / 3];

  const counts = Object.fromEntries(
    SCATTER_QUADRANTS.map((q) => [q.id, roster.filter((s) => s.scatterQuadrant === q.id).length]),
  );

  const toX = (score) => padL + (score / 100) * plotW;
  const toY = (pct) => padT + (1 - pct / 100) * plotH;

  const quadrantRegions = [
    { id: "tl", x: padL, y: padT, w: midX - padL, h: midY - padT },
    { id: "tr", x: midX, y: padT, w: padL + plotW - midX, h: midY - padT },
    { id: "bl", x: padL, y: midY, w: midX - padL, h: plotBottom - midY },
    { id: "br", x: midX, y: midY, w: padL + plotW - midX, h: plotBottom - midY },
  ];

  const quadrantMeta = Object.fromEntries(SCATTER_QUADRANTS.map((q) => [q.id, q]));
  const bucketMeta = Object.fromEntries(BUCKETS.map((b) => [b.id, b]));

  const quadrantLabelPos = {
    tl: { anchor: "start", corner: "top" },
    tr: { anchor: "end", corner: "top" },
    bl: { anchor: "start", corner: "bottom" },
    br: { anchor: "end", corner: "bottom" },
  };

  const quadrantTooltip = (q, count) =>
    `${count} student${count === 1 ? "" : "s"} · ${q.label}. ${q.hint}. ${q.desc}`;

  const toggleQuadrant = (id) => onSelectQuadrant(selectedQuadrant === id ? null : id);

  const overlayBtnStyle = (region) => ({
    position: "absolute",
    left: `${(region.x / W) * 100}%`,
    top: `${(region.y / H) * 100}%`,
    width: `${(region.w / W) * 100}%`,
    height: `${(region.h / H) * 100}%`,
    opacity: 0,
    cursor: "pointer",
    border: "none",
    padding: 0,
    margin: 0,
    background: "transparent",
    zIndex: 2,
  });

  const renderQuadrantLabels = () => quadrantRegions.map((region) => {
    const q = quadrantMeta[region.id];
    const count = counts[region.id];
    const pos = quadrantLabelPos[region.id];
    const textX = pos.anchor === "end" ? region.x + region.w - 10 : region.x + 10;
    const labelY = pos.corner === "top" ? region.y + 16 : region.y + region.h - 28;
    const countY = pos.corner === "top" ? region.y + 34 : region.y + region.h - 10;
    return (
      <g key={`label-${region.id}`} style={{ pointerEvents: "none" }}>
        <text
          x={textX} y={labelY} textAnchor={pos.anchor}
          fontSize="11" fontWeight="600" fill={T.textMuted} fontFamily={T.font}
        >
          {q.label}
        </text>
        <text
          x={textX} y={countY} textAnchor={pos.anchor}
          fontSize="18" fontWeight="700" fill={T.textHigh} fontFamily={T.font}
        >
          {count}
        </text>
      </g>
    );
  });

  const renderDots = () => roster.map((student) => {
    const bucket = bucketMeta[student.bucket];
    const jx = scatterJitter(student.id, 0) * 9;
    const jy = scatterJitter(student.id, 1) * 9;
    const cx = Math.max(padL + DOT_R, Math.min(padL + plotW - DOT_R, toX(student.proficiencyScore) + jx));
    const cy = Math.max(padT + DOT_R, Math.min(plotBottom - DOT_R, toY(student.completionPct) + jy));
    const dim = selectedQuadrant && selectedQuadrant !== student.scatterQuadrant;
    return (
      <g
        key={student.id}
        onClick={(e) => {
          e.stopPropagation();
          toggleQuadrant(student.scatterQuadrant);
        }}
        style={{ cursor: "pointer", opacity: dim ? 0.2 : 1, pointerEvents: "all" }}
      >
        <title>
          {`${student.name} · ${bucket.label} · ${student.proficiencyScore}% proficiency · ${student.completionPct}% activity completion`}
        </title>
        <circle cx={cx} cy={cy} r={DOT_R + 5} fill="transparent" />
        <circle cx={cx} cy={cy} r={DOT_R} fill={bucket.dot} />
      </g>
    );
  });

  return (
    <div style={chartOnly ? { width: W, maxWidth: "100%", flexShrink: 0 } : undefined}>
      {!chartOnly && (
        <>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
            Dot color shows estimated proficiency — click a quadrant to view students below the chart.
          </div>
          <ScatterPlotLegend />
        </>
      )}

      <div
        role="group"
        aria-label="Student distribution quadrants"
        style={{
          position: "relative", width: W, maxWidth: "100%", aspectRatio: `${W} / ${H}`, flexShrink: 0,
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        >
          <rect
            x={padL} y={padT} width={plotW} height={plotH}
            fill="#fff" stroke={T.border} strokeWidth="1"
          />

          {quadrantRegions.map((region) => {
            const q = quadrantMeta[region.id];
            const dim = selectedQuadrant && selectedQuadrant !== region.id;
            const selected = selectedQuadrant === region.id;
            return (
              <rect
                key={`bg-${region.id}`}
                x={region.x} y={region.y} width={region.w} height={region.h}
                fill={q.bg}
                stroke={selected ? T.action : "none"}
                strokeWidth={selected ? 2 : 0}
                style={{ opacity: dim ? 0.35 : 1, transition: "opacity 0.15s" }}
              />
            );
          })}

          {GRID_THIRDS.map((pct) => (
            <g key={`grid-${pct}`}>
              <line
                x1={toX(pct)} y1={padT} x2={toX(pct)} y2={plotBottom}
                stroke={T.rowStripe} strokeWidth="1"
              />
              <line
                x1={padL} y1={toY(pct)} x2={padL + plotW} y2={toY(pct)}
                stroke={T.rowStripe} strokeWidth="1"
              />
            </g>
          ))}

          <line x1={padL} y1={midY} x2={padL + plotW} y2={midY} stroke={T.textHigh} strokeWidth="2.5" />
          <line x1={midX} y1={padT} x2={midX} y2={plotBottom} stroke={T.textHigh} strokeWidth="2.5" />

          {renderQuadrantLabels()}

          <line x1={padL} y1={plotBottom} x2={padL + plotW} y2={plotBottom} stroke={T.textMuted} strokeWidth="1.5" />
          <line x1={padL} y1={padT} x2={padL} y2={plotBottom} stroke={T.textMuted} strokeWidth="1.5" />

          {[0, 50, 100].map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={toX(tick)} y1={plotBottom} x2={toX(tick)} y2={plotBottom + 5}
                stroke={T.textMuted} strokeWidth="1"
              />
              <text
                x={toX(tick)} y={plotBottom + 18}
                textAnchor="middle" fontSize="10" fill={T.textMuted} fontFamily={T.font}
              >
                {tick}%
              </text>
            </g>
          ))}

          {[0, 50, 100].map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={padL - 5} y1={toY(tick)} x2={padL} y2={toY(tick)}
                stroke={T.textMuted} strokeWidth="1"
              />
              <text
                x={padL - 8} y={toY(tick) + 4}
                textAnchor="end" fontSize="10" fill={T.textMuted} fontFamily={T.font}
              >
                {tick}%
              </text>
            </g>
          ))}

          <text
            x={padL + plotW / 2} y={H - 8}
            textAnchor="middle" fontSize="12" fontWeight="600" fill={T.textHigh} fontFamily={T.font}
          >
            Overall Learning Proficiency →
          </text>
          <text
            x={14} y={padT + plotH / 2}
            textAnchor="middle" fontSize="12" fontWeight="600" fill={T.textHigh} fontFamily={T.font}
            transform={`rotate(-90, 14, ${padT + plotH / 2})`}
          >
            Activity Completion →
          </text>
        </svg>

        {quadrantRegions.map((region) => {
          const q = quadrantMeta[region.id];
          const count = counts[region.id];
          const selected = selectedQuadrant === region.id;
          return (
            <button
              key={`btn-${region.id}`}
              type="button"
              aria-pressed={selected}
              aria-label={`${q.label}, ${count} students. ${q.hint}. ${q.desc}`}
              title={quadrantTooltip(q, count)}
              onClick={() => toggleQuadrant(region.id)}
              onFocus={(e) => {
                e.currentTarget.style.outline = `2px solid ${T.action}`;
                e.currentTarget.style.outlineOffset = "-2px";
              }}
              onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
              style={overlayBtnStyle(region)}
            />
          );
        })}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            display: "block", pointerEvents: "none", zIndex: 3,
          }}
        >
          {renderDots()}
        </svg>
      </div>
    </div>
  );
}

const PIE_CHART_ORDER = ["tl", "tr", "br", "bl"];

function donutSlicePath(cx, cy, rOuter, rInner, startRad, endRad, explodePx = 0) {
  if (endRad - startRad <= 0) return "";
  const mid = (startRad + endRad) / 2;
  const ox = cx + explodePx * Math.cos(mid);
  const oy = cy + explodePx * Math.sin(mid);
  const large = endRad - startRad > Math.PI ? 1 : 0;
  const x1o = ox + rOuter * Math.cos(startRad);
  const y1o = oy + rOuter * Math.sin(startRad);
  const x2o = ox + rOuter * Math.cos(endRad);
  const y2o = oy + rOuter * Math.sin(endRad);
  const x2i = ox + rInner * Math.cos(endRad);
  const y2i = oy + rInner * Math.sin(endRad);
  const x1i = ox + rInner * Math.cos(startRad);
  const y1i = oy + rInner * Math.sin(startRad);
  return [
    `M ${x1o} ${y1o}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x2i} ${y2i}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x1i} ${y1i}`,
    "Z",
  ].join(" ");
}

function StudentDistributionPie({ roster, selectedSegment, onSelectSegment, inline = false }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 118;
  const rInner = 68;
  const total = roster.length || 1;
  const quadrantMeta = Object.fromEntries(SCATTER_QUADRANTS.map((q) => [q.id, q]));
  const counts = Object.fromEntries(
    SCATTER_QUADRANTS.map((q) => [q.id, roster.filter((s) => s.scatterQuadrant === q.id).length]),
  );

  const toggleSegment = (id) => onSelectSegment(selectedSegment === id ? null : id);

  let angle = -Math.PI / 2;
  const slices = PIE_CHART_ORDER.map((id) => {
    const count = counts[id];
    const sweep = (count / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    if (count === 0) return null;
    const q = quadrantMeta[id];
    const selected = selectedSegment === id;
    const dim = selectedSegment && !selected;
    return { id, q, count, start, end, selected, dim };
  }).filter(Boolean);

  return (
    <div style={inline ? { flexShrink: 0, minWidth: 0 } : { maxWidth: 480 }}>
      {!inline && (
        <>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
            Dot color shows estimated proficiency — click a segment to view students beside the chart.
          </div>
          <ScatterPlotLegend />
        </>
      )}

      <div
        role="group"
        aria-label="Student distribution by activity completion and proficiency"
        style={{ marginTop: inline ? 0 : 16, marginBottom: 20 }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{
            display: "block", width: size, maxWidth: "100%", height: "auto",
            margin: inline ? 0 : "0 auto",
          }}
        >
          {slices.length === 0 ? (
            <circle cx={cx} cy={cy} r={rOuter} fill={T.rowStripe} />
          ) : (
            slices.map((slice) => (
              <path
                key={slice.id}
                d={donutSlicePath(cx, cy, rOuter, rInner, slice.start, slice.end, slice.selected ? 10 : 0)}
                fill={slice.q.pieColor}
                stroke={slice.selected ? "#fff" : "none"}
                strokeWidth={slice.selected ? 3 : 0}
                opacity={slice.dim ? 0.35 : 1}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                onClick={() => toggleSegment(slice.id)}
              >
                <title>{`${slice.q.label}: ${slice.count} student${slice.count === 1 ? "" : "s"}`}</title>
              </path>
            ))
          )}
        </svg>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px",
        fontSize: 12.5, color: T.textMuted,
      }}>
        {SCATTER_QUADRANTS.map((q) => {
          const count = counts[q.id];
          const pct = Math.round((count / total) * 100);
          const selected = selectedSegment === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => toggleSegment(q.id)}
              title={`${q.label}. ${q.hint}`}
              style={{
                fontFamily: T.font, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 8,
                background: selected ? T.tableSelect : "transparent",
                border: selected ? `1.5px solid ${T.action}` : "1.5px solid transparent",
                borderRadius: 8, padding: "8px 10px",
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 5, background: q.pieColor, flexShrink: 0 }} />
              <span style={{ flex: 1, color: T.textHigh, fontWeight: 500, lineHeight: 1.3 }}>{q.label}</span>
              <span style={{
                fontSize: 12, fontWeight: 600, color: selected ? T.textHigh : T.textMuted,
                background: T.rowStripe, borderRadius: 999, padding: "2px 8px", flexShrink: 0,
              }}>
                {count}
              </span>
              <span style={{ fontSize: 12, color: T.textMuted, width: 36, textAlign: "right", flexShrink: 0 }}>
                {pct}%
              </span>
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

function StudentsPanel({ objective, bucketId, students, onClose, scatterView = false }) {
  const scatterQ = scatterView ? SCATTER_QUADRANTS.find((q) => q.id === bucketId) : null;
  const bucket = !scatterView ? BUCKETS.find((b) => b.id === bucketId) : null;
  const [selected, setSelected] = useState(() => new Set(students.map((s) => s.id)));
  const allChecked = students.length > 0 && students.every((s) => selected.has(s.id));
  const selectedCount = students.filter((s) => selected.has(s.id)).length;
  const highActivityStudents = scatterView
    ? []
    : students.filter((s) => isHighActivityLowProficiency(s, objective.activitiesCount));

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

  const bucketChip = scatterView ? null : CHIP_FIGMA[BUCKET_CHIP_KEY[bucketId]];
  const panelTitle = scatterQ?.panel ?? bucket?.panel;
  const badgeColor = scatterQ ? scatterQ.badgeColor : bucketChip.color;
  const badgeBg = scatterQ ? scatterQ.badgeBg : bucketChip.bg;

  const showPriorityBanner = !scatterView && bucketId === "low" && highActivityStudents.length > 0;

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 9, background: "#fff", overflow: "hidden" }}>
      <div style={{
        padding: "12px 14px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 38 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#373a44" }}>
            {panelTitle}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: badgeColor,
            background: badgeBg,
            borderRadius: 999, padding: "4px 8px", lineHeight: 1,
          }}>
            {students.length}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={sendEmail}
              disabled={selectedCount === 0}
              style={{
                fontFamily: T.font, cursor: selectedCount === 0 ? "default" : "pointer",
                background: "#fff",
                color: selectedCount === 0 ? T.textMuted : T.action,
                border: `1px solid ${selectedCount === 0 ? T.border : T.buttonBorderBold}`,
                borderRadius: 6, padding: "8px 16px", fontSize: 14, fontWeight: 600,
                boxShadow: selectedCount === 0 ? "none" : T.buttonShadow,
                display: "inline-flex", alignItems: "center", gap: 8,
                opacity: selectedCount === 0 ? 0.7 : 1,
              }}
            >
              <AppIcon src={ICONS.mail} size={16} /> Email
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
        {scatterView && scatterQ?.desc && (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: T.textMuted, lineHeight: 1.55, maxWidth: 900 }}>
            {scatterQ.desc}
          </p>
        )}
      </div>

      {showPriorityBanner && (
        <div style={{
          padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
          background: T.dangerFill, borderLeft: `3px solid ${T.danger}`,
          fontSize: 13, color: T.textLow, lineHeight: 1.5,
        }}>
          <strong style={{ color: T.danger }}>
            {highActivityStudents.length} student{highActivityStudents.length === 1 ? "" : "s"}
          </strong>
          {" "}
          completed most related activities but still show low proficiency — this suggests a{" "}
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
              <th style={th}>Student Name <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} /></th>
              <th style={th}>Activities Attempted <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} /></th>
              <th style={th}>Avg. Correctness</th>
              <th style={th}>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const highActivity = !scatterView && isHighActivityLowProficiency(s, objective.activitiesCount);
              const attemptPct = Math.round((s.attempted / objective.activitiesCount) * 100);
              const profBucket = BUCKETS.find((b) => b.id === s.bucket);
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
                      {scatterView && profBucket && (
                        <span
                          title={profBucket.label}
                          style={{
                            width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                            background: profBucket.dot,
                          }}
                        />
                      )}
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
                      {!scatterView && highActivity && (
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

function bucketCounts(roster) {
  return Object.fromEntries(
    BUCKETS.map((b) => [b.id, roster.filter((s) => s.bucket === b.id).length]),
  );
}

function weakestActivity(objective) {
  if (!objective.activities?.length) return null;
  return objective.activities.reduce((min, a) => (a.correctness < min.correctness ? a : min));
}

function densityMisconception() {
  const item = DENSITY_QUESTION_ITEMS.find((q) => q.id === 3);
  if (!item?.answers) return null;
  const wrong = item.answers
    .filter((a) => !a.correct && a.text !== "No answer / skipped")
    .reduce((max, a) => (!max || a.count > max.count ? a : max), null);
  return wrong ? { answer: wrong.text, count: wrong.count } : null;
}

function getAIRecommendation(objective, roster) {
  const counts = bucketCounts(roster);
  const lowCount = counts.low;
  const noneCount = counts.none;
  const highCount = counts.high;
  const mediumCount = counts.medium;
  const weakest = weakestActivity(objective);
  const activityNum = weakest?.name.match(/Activity (\d+)/)?.[1];
  const highActivityLow = roster.filter(
    (s) => isHighActivityLowProficiency(s, objective.activitiesCount),
  ).length;
  const n = objective.activitiesCount;

  switch (objective.id) {
    case "lo-density": {
      const misc = densityMisconception();
      const miscPhrase = misc
        ? `the most common incorrect rearrangement (${misc.answer}, selected by ${misc.count} students on first attempt)`
        : "common rearrangement errors in Activity 4";
      return {
        text: `Evidence suggests a class-wide conceptual gap in rearranging the density equation: ${lowCount} of ${TOTAL_STUDENTS} students show Low proficiency with high confidence in the estimate, supported by substantial evidence across ${n} linked activities. Consider beginning class with targeted practice on ${weakest?.name ?? "Activity 4"}, then facilitate discussion around ${miscPhrase}.`,
        steps: {
          review: weakest && activityNum ? {
            label: `Review Activity ${activityNum}`,
            desc: `Open ${weakest.name} (${weakest.correctness}% class correctness, ${weakest.completion}% completion) and inspect first-attempt responses on equation rearrangement.`,
            questionId: questionIdForActivityReview(objective, activityNum),
          } : null,
          viewStudents: lowCount > 0 ? {
            label: `View ${lowCount} Students`,
            desc: `Compare attempt history across ${lowCount} Low-proficiency students — ${highActivityLow} completed ≥60% of activities yet remain Low, suggesting a misconception rather than low participation.`,
            bucket: "low",
          } : null,
          email: highActivityLow > 0 ? {
            label: "Email Students",
            desc: `Consider inviting the ${highActivityLow} students who practiced extensively but remain Low to retry linked activities and review feedback on density rearrangement before the assessment.`,
            bucket: "low",
          } : null,
        },
      };
    }

    case "lo-molarity-1":
      return {
        text: `Proficiency estimates for this objective are not yet reliable: ${noneCount} of ${TOTAL_STUDENTS} students have Not Enough Data, with only ${n} related ${n === 1 ? "activity" : "activities"} linked and low confidence in class-level estimates. Consider encouraging completion of the associated Learn by Doing before interpreting Low or Medium proficiency levels.`,
        steps: {
          review: null,
          viewStudents: noneCount > 0 ? {
            label: `View ${noneCount} Students`,
            desc: `Identify the ${noneCount} students with Not Enough Data — with only ${n} linked ${n === 1 ? "activity" : "activities"}, their proficiency cannot yet be estimated reliably.`,
            bucket: "none",
          } : lowCount > 0 ? {
            label: `View ${lowCount} Students`,
            desc: `Review the ${lowCount} students currently estimated Low — with limited activity coverage, their estimates may change as more evidence is collected.`,
            bucket: "low",
          } : null,
          email: noneCount > 0 ? {
            label: "Email Students",
            desc: `Consider reminding the ${noneCount} students who have not yet generated enough evidence to complete the linked activity before you interpret class-wide proficiency.`,
            bucket: "none",
          } : null,
        },
      };

    case "lo-sigfigs":
      return {
        text: `Evidence suggests strong mastery on this objective: ${highCount} of ${TOTAL_STUDENTS} students show High proficiency with high confidence across ${n} linked activities, with only ${lowCount} Low. You may want to spend less class time reviewing multiplication and division significant figure rules and reallocate attention to objectives with greater instructional need.`,
        steps: {
          review: null,
          viewStudents: lowCount > 0 ? {
            label: `View ${lowCount} Students`,
            desc: `With only ${lowCount} students estimated Low, consider brief individual or small-group check-ins on applying the multiplication/division rule rather than a full-class review.`,
            bucket: "low",
          } : null,
          email: null,
        },
      };

    case "lo-molarity-2":
      return {
        text: `${lowCount} students show Low proficiency and ${mediumCount} are at Medium on applying the molarity equation — evidence of developing but uneven mastery across ${n} linked activities. Consider assigning additional formative practice to the Low group and using a short in-class check on M = n/V before the next assessment.`,
        steps: {
          review: null,
          viewStudents: lowCount > 0 ? {
            label: `View ${lowCount} Students`,
            desc: `Review attempt history for the ${lowCount} Low-proficiency students and identify whether gaps reflect incomplete practice or persistent calculation errors.`,
            bucket: "low",
          } : null,
          email: lowCount > 0 && lowCount <= 8 ? {
            label: "Email Students",
            desc: `Consider reaching out to the ${lowCount} Low-proficiency students with links to linked practice activities and an invitation to attempt them before the assessment.`,
            bucket: "low",
          } : null,
        },
      };

    case "lo-molarity-3":
      return {
        text: `With only ${n} linked activities, many students are still building evidence for this objective; ${lowCount} currently show Low proficiency and ${noneCount} have Not Enough Data — confidence in these estimates remains low. Consider encouraging completion of remaining Learn by Doing opportunities, then reviewing responses with students who remain Low after multiple attempts.`,
        steps: {
          review: null,
          viewStudents: lowCount > 0 ? {
            label: `View ${lowCount} Students`,
            desc: `Examine the ${lowCount} Low-proficiency students' attempt history across the ${n} available activities to determine whether additional practice or misconception review is needed.`,
            bucket: "low",
          } : null,
          email: (lowCount + noneCount) > 0 ? {
            label: "Email Students",
            desc: `Consider encouraging students with Low proficiency or Not Enough Data to complete the ${n} linked activities so estimates reflect their current understanding.`,
            bucket: lowCount > 0 ? "low" : "none",
          } : null,
        },
      };

    case "lo-scatter-demo":
    case "lo-pie-demo": {
      const tlCount = roster.filter((s) => s.scatterQuadrant === "tl").length;
      const blCount = roster.filter((s) => s.scatterQuadrant === "bl").length;
      return {
        text: `The student distribution shows ${tlCount} student${tlCount === 1 ? "" : "s"} working hard but still struggling — high activity completion with low proficiency on reaction order and rate constants. ${blCount} student${blCount === 1 ? "" : "s"} show low participation and may need outreach. Consider a brief small-group review for the working-hard group, focusing on ${weakest?.name ?? "integrated rate laws and order determination"}.`,
        steps: {
          review: weakest && activityNum ? {
            label: `Review Activity ${activityNum}`,
            desc: `Open ${weakest.name} (${weakest.correctness}% class correctness) — weakest linked activity for this kinetics objective.`,
            questionId: questionIdForActivityReview(objective, activityNum),
          } : null,
          viewStudents: tlCount > 0 ? {
            label: `View ${tlCount} Students`,
            desc: `Open the "working hard, struggling" quadrant — students completing activities but not yet demonstrating proficiency.`,
            bucket: "tl",
          } : null,
          email: tlCount > 0 ? {
            label: "Email Students",
            desc: `Consider inviting the ${tlCount} highest-priority students to retry practice activities and review feedback before the assessment.`,
            bucket: "tl",
          } : null,
        },
      };
    }

    default:
      return {
        text: `Evidence suggests ${lowCount} of ${TOTAL_STUDENTS} students show Low proficiency on this objective. Consider reviewing linked activities and student attempt history before the next assessment.`,
        steps: {
          review: weakest && activityNum ? {
            label: `Review Activity ${activityNum}`,
            desc: `Inspect ${weakest.name}, the lowest-performing linked activity (${weakest.correctness}% correctness).`,
            questionId: questionIdForActivityReview(objective, activityNum),
          } : null,
          viewStudents: lowCount > 0 ? {
            label: `View ${lowCount} Students`,
            desc: `Compare attempt history across students estimated Low on this objective.`,
            bucket: "low",
          } : null,
          email: lowCount > 0 ? {
            label: "Email Students",
            desc: `Consider inviting Low-proficiency students to complete linked practice before the assessment.`,
            bucket: "low",
          } : null,
        },
      };
  }
}

function AIRecommendation({ objective, roster, onSelectBucket, onReviewActivity }) {
  const [open, setOpen] = useState(false);
  const { text: recommendationText, steps: stepConfig } = getAIRecommendation(objective, roster);

  const steps = [
    stepConfig.review && {
      iconSrc: ICONS.practice,
      ...stepConfig.review,
      onClick: () => onReviewActivity(stepConfig.review.questionId),
    },
    stepConfig.viewStudents && {
      iconSrc: ICONS.users,
      ...stepConfig.viewStudents,
      onClick: () => onSelectBucket(stepConfig.viewStudents.bucket),
    },
    stepConfig.email && {
      iconSrc: ICONS.mail,
      ...stepConfig.email,
      onClick: () => onSelectBucket(stepConfig.email.bucket),
    },
  ].filter(Boolean);

  if (steps.length === 0) return null;

  const cardShell = {
    border: `1px solid ${T.border}`,
    borderLeft: `3px solid ${T.action}`,
    borderRadius: 6,
    background: "#fff",
    overflow: "hidden",
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          ...cardShell,
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: "14px 18px",
          cursor: "pointer",
          fontFamily: T.font,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1, color: T.action }} aria-hidden>✦</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.textHigh }}>
            Suggest next steps
          </span>
          <span style={{ display: "block", fontSize: 13, color: T.textMuted, marginTop: 2 }}>
            View recommendations based on proficiency and activity data for this objective
          </span>
        </span>
        <span style={{ color: T.action, fontSize: 20, lineHeight: 1, flexShrink: 0 }} aria-hidden>›</span>
      </button>
    );
  }

  return (
    <div style={cardShell}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 18px", background: T.tableHover,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 18, lineHeight: 1, color: T.action }} aria-hidden>✦</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.textHigh }}>
          Next steps
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            fontFamily: T.font, background: "none", border: "none", cursor: "pointer",
            color: T.link, fontSize: 13, fontWeight: 600, padding: "4px 0",
          }}
        >
          Hide
        </button>
      </div>

      <div style={{ padding: "16px 18px 8px" }}>
        <p style={{ margin: 0, fontSize: 16, color: T.textLow, lineHeight: 1.55, maxWidth: 1060 }}>
          {recommendationText}
        </p>
      </div>

      <div style={{ padding: "4px 18px 12px" }}>
        {steps.map((step, i) => (
          <div
            key={step.label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              padding: "14px 0",
              borderTop: i === 0 ? `1px solid ${T.border}` : "none",
              borderBottom: i < steps.length - 1 ? `1px solid ${T.rowStripe}` : "none",
            }}
          >
            <SecondaryActionButton iconSrc={step.iconSrc} onClick={step.onClick}>
              {step.label}
            </SecondaryActionButton>
            <p style={{
              margin: 0, flex: 1, minWidth: 200, paddingTop: 8,
              fontSize: 15, color: T.textLow, lineHeight: 1.5,
            }}>
              {step.desc}
            </p>
          </div>
        ))}
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
        This objective has no sub-objectives.
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>
              Sub-objective <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} />
            </th>
            <th style={{ ...th, width: 200 }}>
              Student Proficiency
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
                <ProficiencyCell
                  chipLabel={sub.chip}
                  confidence={sub.confidence}
                  scope="Class-level status for this sub-objective."
                />
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

  const bucketStudents = useMemo(
    () => {
      if (!selectedBucket) return [];
      if (usesDistributionChart(objective)) {
        return roster.filter((s) => s.scatterQuadrant === selectedBucket);
      }
      return roster.filter((s) => s.bucket === selectedBucket);
    },
    [roster, selectedBucket, objective],
  );

  const openActivities = (expandQuestionId = null) => {
    onViewActivities(objective.id, expandQuestionId);
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
          }}>
            <ChevronIcon direction={expanded ? "up" : "down"} size={12} inverted={expanded} />
          </span>
        </td>
        <td style={thRow}>
          {objective.title}
        </td>
        <td style={{ ...thRow, width: 200 }} onClick={(e) => e.stopPropagation()}>
          <Chip label={objective.chip} scope="Class-level status for this objective." variant="figma" />
        </td>
        <td style={{ ...thRow, width: 160 }} onClick={(e) => e.stopPropagation()}>
          <ConfidenceBadge level={objective.confidence} variant="compact" />
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
          <td colSpan={6} style={{ padding: 0, borderTop: `1px solid ${T.border}`, background: T.tableHover }}>
            <div style={{
              padding: "24px clamp(12px, 4vw, 24px) 24px clamp(16px, 6vw, 66px)",
              display: "flex", flexDirection: "column", gap: 24,
              maxWidth: "100%", minWidth: 0, boxSizing: "border-box",
            }}>
              {/* header + how-estimated disclosure */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: T.textHigh }}>
                    {usesDistributionChart(objective) ? "Student Distribution" : "Estimated Learning"}: {TOTAL_STUDENTS} Students
                  </span>
                  <ConfidenceBadge level={objective.confidence} showSeparateNote />
                </div>
                {usesDistributionChart(objective) && (
                  <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6, lineHeight: 1.5 }}>
                    Proficiency estimates reflect how likely each student is to demonstrate this objective,
                    based on their scores on linked activities, use of hints, number of attempts, and whether
                    understanding may have faded over time.
                  </div>
                )}
              </div>

              {objective.distributionChart === "scatter" ? (
                <>
                  <StudentDistributionPlot
                    roster={roster}
                    selectedQuadrant={selectedBucket}
                    onSelectQuadrant={onSelectBucket}
                  />
                  {selectedBucket && (
                    <StudentsPanel
                      key={selectedBucket}
                      objective={objective}
                      bucketId={selectedBucket}
                      students={bucketStudents}
                      scatterView
                      onClose={() => onSelectBucket(null)}
                    />
                  )}
                </>
              ) : objective.distributionChart === "pie" ? (
                <>
                  <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>
                    Dot color shows estimated proficiency — click a segment to view students beside the chart.
                  </div>
                  <ScatterPlotLegend />
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: selectedBucket
                      ? "min(480px, 100%) minmax(0, 1fr)"
                      : "min(480px, 100%)",
                    gap: 24,
                    alignItems: "start",
                    width: "100%",
                    maxWidth: "100%",
                  }}>
                    <StudentDistributionPie
                      roster={roster}
                      selectedSegment={selectedBucket}
                      onSelectSegment={onSelectBucket}
                      inline
                    />
                    {selectedBucket && (
                      <div style={{ minWidth: 0 }}>
                        <StudentsPanel
                          key={selectedBucket}
                          objective={objective}
                          bucketId={selectedBucket}
                          students={bucketStudents}
                          scatterView
                          onClose={() => onSelectBucket(null)}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              <AIRecommendation
                objective={objective}
                roster={roster}
                onSelectBucket={onSelectBucket}
                onReviewActivity={(questionId) => openActivities(questionId)}
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
          }}>
            <ChevronIcon direction={open ? "up" : "down"} size={12} inverted={open} />
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
            {weak && <AppIcon src={ICONS.warning} size={16} alt="Needs attention" />}
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

function ObjectiveActivitiesView({ objective, onBack, initialExpandedQuestionId = null }) {
  const items = getActivityItems(objective);
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [attemptsFilter, setAttemptsFilter] = useState("all");
  const [expanded, setExpanded] = useState(
    () => (initialExpandedQuestionId ? new Set([initialExpandedQuestionId]) : new Set()),
  );

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
      <ChevronIcon size={10} style={{ marginLeft: -16, pointerEvents: "none" }} />
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
            <AppIcon src={ICONS.trash} size={16} /> Clear All Filters
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ fontSize: 14, color: T.textMuted, fontStyle: "italic", background: "#fff", padding: 24 }}>
          No questions available for this objective.
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
                  <th style={th}>Question Stem <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} /></th>
                  <th style={{ ...th, width: 171 }}>Attempts <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} /></th>
                  <th style={{ ...th, width: 196 }}>% Correct <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} /></th>
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
  const [confidenceFilter, setConfidenceFilter] = useState("All");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
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
  };
  const toggleCard = () => {
    if (activeCard === "objectives") {
      setActiveCard(null);
      setProficiencyFilter("All");
      setConfidenceFilter("All");
      setBucketSelections({});
      return;
    }
    const c = CARD_FILTERS.objectives;
    setActiveCard("objectives");
    setProficiencyFilter(c.filter);
    setBucketSelections({});
  };

  const rows = OBJECTIVES
    .filter((lo) => {
      if (search && !lo.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (proficiencyFilter !== "All" && lo.chip !== proficiencyFilter) return false;
      if (confidenceFilter !== "All" && lo.confidence !== confidenceFilter) return false;
      return true;
    })
    .sort((a, b) => PRIORITY[a.chip] - PRIORITY[b.chip]);

  const lowOutcomes = OBJECTIVES.filter((lo) => lo.chip === "Needs Attention").length;

  const th = {
    textAlign: "left", fontSize: 16, fontWeight: 600, color: T.textHigh,
    padding: "10px", borderBottom: `1px solid ${T.border}`, background: "#fff",
    height: 50, verticalAlign: "middle",
  };

  const highlightCard = (active) => ({
    border: active ? `1.5px solid ${T.action}` : `1px solid ${T.highlightCardBorder}`,
    background: active ? T.tableSelect : T.highlightCardBg,
    borderRadius: 16, padding: "20px 24px", width: 322, minHeight: 120, cursor: "pointer",
    boxShadow: "0 2px 5px rgba(0, 50, 99, 0.10)",
  });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px 64px" }}>
      <div style={{ background: "#fff", padding: "32px 20px" }}>
        {/* header + highlight cards + download */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.textHigh }}>
            Learning Objectives
          </h2>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              color: T.action, fontSize: 14, fontWeight: 700, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
            }}
          >
            Download CSV <span style={{ fontSize: 16 }}>⬇</span>
          </a>
        </div>
        <ProficiencyIntro />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div
            style={highlightCard(activeCard === "objectives")}
            onClick={toggleCard}
            title="Filter the table to learning objectives with low proficiency"
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: T.highlightCardText, lineHeight: 1.5, marginBottom: 12 }}>
              Low Proficiency Learning Objectives
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: T.highlightCardText, lineHeight: 1.1 }}>
              {lowOutcomes}
            </div>
          </div>
        </div>

        {/* filter bar */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap",
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
            <ChevronIcon size={10} style={{ marginLeft: -16, pointerEvents: "none" }} />
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            border: `1px solid ${T.border}`, borderRadius: 3, padding: "8px 10px", height: 35,
          }}>
            <select
              value={confidenceFilter}
              onChange={(e) => { setConfidenceFilter(e.target.value); setActiveCard(null); }}
              aria-label="Filter by confidence level"
              style={{
                fontFamily: T.font, fontSize: 16, fontWeight: 600, padding: 0,
                border: "none", color: T.textHigh, background: "transparent", outline: "none",
                cursor: "pointer", appearance: "none", paddingRight: 20,
              }}
            >
              <option value="All">Confidence</option>
              <option value="high" title={CONFIDENCE_FILTER_HINTS.high}>High</option>
              <option value="medium" title={CONFIDENCE_FILTER_HINTS.medium}>Medium</option>
              <option value="low" title={CONFIDENCE_FILTER_HINTS.low}>Low</option>
            </select>
            <ChevronIcon size={10} style={{ marginLeft: -16, pointerEvents: "none" }} />
          </div>
          <button
            onClick={() => {
              setSearch("");
              setProficiencyFilter("All");
              setConfidenceFilter("All");
              setActiveCard(null);
              setBucketSelections({});
            }}
            style={{
              fontFamily: T.font, fontSize: 14, color: T.textHigh, background: "none",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              padding: "10px",
            }}
          >
            <AppIcon src={ICONS.trash} size={16} /> Clear All Filters
          </button>
        </div>

        {/* objectives table */}
        <div style={{ border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 48 }} />
                <th style={th}>
                  Learning Objective <ChevronIcon size={10} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} />
                </th>
                <th style={{ ...th, width: 220 }}>
                  Student Proficiency
                </th>
                <th style={{ ...th, width: 160 }}>Confidence</th>
                <th style={{ ...th, width: 200 }}>Proficiency Distribution</th>
                <th style={{ ...th, width: 200, paddingLeft: 25 }}>Related Activities</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, fontSize: 13, color: T.textMuted, fontStyle: "italic" }}>
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
  const [activityView, setActivityView] = useState(null);
  const activityObjective = activityView
    ? OBJECTIVES.find((o) => o.id === activityView.objectiveId)
    : null;

  const openActivityView = (objectiveId, expandQuestionId = null) => {
    setActivityView({ objectiveId, expandQuestionId });
  };

  return (
    <div style={{ fontFamily: T.font, background: T.bgPrimary, minHeight: "100vh", color: T.textHigh }}>
      <TopNav />
      <InsightsTabs />
      {activityObjective ? (
        <ObjectiveActivitiesView
          key={`${activityView.objectiveId}-${activityView.expandQuestionId ?? "none"}`}
          objective={activityObjective}
          initialExpandedQuestionId={activityView.expandQuestionId}
          onBack={() => setActivityView(null)}
        />
      ) : (
        <>
          <ModulePager />
          <LearningObjectivesCard onViewActivities={openActivityView} />
        </>
      )}
    </div>
  );
}
