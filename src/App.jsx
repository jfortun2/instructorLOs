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
  shadow: "0 2px 10px rgba(0, 50, 99, 0.10)",
};

// Proficiency buckets — presentation labels only; underlying buckets (and the
// proficiency calculation) are unchanged. Colors match the Torus purple ramp.
const BUCKETS = [
  {
    id: "none", label: "Not Enough Data", panel: "Students with Not Enough Data", dot: "#9b9ea8", seg: "#caccd3",
    desc: "Student has not completed enough related activities for a reliable estimate.",
  },
  {
    id: "low", label: "Needs Attention", panel: "Students Needing Attention", dot: "#ce2c31", seg: "#f0a6ab",
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
    attempts: 56, correctPct: 25,
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
    attempts: 54, correctPct: 42,
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
      roster.push({ id: `${objective.id}-${name}`, name, email: emailFor(name), bucket, attempted, correctness, lastActivity });
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

function Chip({ label, scope }) {
  const s = CHIP_STYLES[label];
  return (
    <span
      title={scope ? `${scope} ${CHIP_DESCRIPTIONS[label]}` : CHIP_DESCRIPTIONS[label]}
      style={{
        display: "inline-block", background: s.bg, color: s.color, cursor: "help",
        fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 999, whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// Mini segmented distribution bar — matches the existing Torus row pattern.
// Each segment carries a tooltip (count, %, and what the level means); the
// optional caption surfaces the struggling share without hovering.
function MiniDistBar({ dist, width = 96, caption = false }) {
  const total = dist.reduce((a, b) => a + b, 0);
  const pct = (n) => Math.round((n / total) * 100);
  const bar = (
    <span style={{
      display: "inline-flex", width, height: 14, borderRadius: 3, overflow: "hidden",
      border: `1px solid ${T.border}`, background: "#fff", gap: 1, cursor: "help",
    }}>
      {dist.map((n, i) => (
        <span
          key={BUCKETS[i].id}
          title={`${BUCKETS[i].label}: ${n} student${n === 1 ? "" : "s"} (${pct(n)}%) — ${BUCKETS[i].desc}`}
          style={{ width: `${(n / total) * 100}%`, background: BUCKETS[i].seg }}
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
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", gap: 8 }}>
        {tabs.map((tab) => {
          const active = tab === "Learning Objectives";
          return (
            <span key={tab} style={{
              padding: "12px 12px", fontSize: 13, cursor: "pointer",
              fontWeight: active ? 700 : 400,
              color: active ? T.textHigh : T.textLow,
              borderBottom: active ? `2px solid ${T.link}` : "2px solid transparent",
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
      display: "flex", alignItems: "center", justifyContent: "center", gap: 48,
    }}>
      <span style={{ color: T.action, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>‹ Previous Module</span>
      <span style={{
        color: T.textHigh, fontSize: 16, fontWeight: 700,
        borderBottom: `2px solid ${T.textHigh}`, paddingBottom: 2, cursor: "pointer",
      }}>
        Module 2: Reaction Rates <span style={{ fontSize: 11 }}>⌄</span>
      </span>
      <span style={{ color: T.action, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Next Module ›</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clickable proficiency bucket cards
// ---------------------------------------------------------------------------

function ProficiencyBuckets({ roster, selectedBucket, onSelectBucket }) {
  const counts = BUCKETS.map((b) => roster.filter((s) => s.bucket === b.id).length);
  const total = roster.length;

  // Dot-strip scatterplot (the production Torus pattern): each dot is one
  // student, stacked in columns within their proficiency region.
  const W = 1000, H = 110, GAP = 8;
  const WEIGHTS = [0.16, 0.4, 0.22, 0.22];
  const PER_COL = 4;
  const trackY = 94;
  let cursor = 0;
  const regions = BUCKETS.map((b, i) => {
    const w = WEIGHTS[i] * (W - GAP * (BUCKETS.length - 1));
    const r = { ...b, x: cursor, w, count: counts[i] };
    cursor += w + GAP;
    return r;
  });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", marginBottom: 10 }}>
        {regions.map((r) => {
          const dim = selectedBucket && selectedBucket !== r.id;
          const selected = selectedBucket === r.id;
          const cols = Math.max(1, Math.ceil(r.count / PER_COL));
          const padX = 24;
          const colSpacing = cols > 1 ? (r.w - padX * 2) / (cols - 1) : 0;
          const dots = [];
          for (let j = 0; j < r.count; j++) {
            dots.push({
              cx: cols > 1 ? r.x + padX + Math.floor(j / PER_COL) * colSpacing : r.x + r.w / 2,
              cy: trackY - 12 - (j % PER_COL) * 14,
            });
          }
          return (
            <g
              key={r.id}
              onClick={() => onSelectBucket(selected ? null : r.id)}
              style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity 0.15s" }}
            >
              <title>{`${r.label}: ${r.count} students (${Math.round((r.count / total) * 100)}%)`}</title>
              {selected && (
                <rect
                  x={r.x - 2} y={4} width={r.w + 4} height={H - 8} rx={8}
                  fill="rgba(0,108,217,0.05)" stroke={T.action} strokeWidth="1.5"
                />
              )}
              <rect x={r.x} y={trackY} width={r.w} height={8} rx={4} fill={r.seg} />
              {dots.map((d, k) => (
                <circle key={k} cx={d.cx} cy={d.cy} r={4.5} fill={r.dot} />
              ))}
              {/* invisible hit area so empty space is clickable too */}
              <rect x={r.x} y={0} width={r.w} height={H} fill="transparent" />
            </g>
          );
        })}
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {BUCKETS.map((b, i) => {
          const selected = selectedBucket === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelectBucket(selected ? null : b.id)}
              title={b.desc}
              style={{
                fontFamily: T.font, cursor: "pointer", textAlign: "left",
                background: selected ? T.tableSelect : "#fff",
                border: selected ? `1.5px solid ${T.action}` : `1px solid ${T.border}`,
                borderRadius: 8, padding: selected ? "11.5px 13.5px" : "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: b.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textHigh }}>{b.label}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 21, fontWeight: 700, color: T.textHigh }}>{counts[i]}</div>
              <div style={{ fontSize: 11.5, color: T.textMuted }}>
                {Math.round((counts[i] / total) * 100)}% of class · {selected ? "click to clear" : "view students"}
              </div>
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

function StudentsPanel({ objective, bucketId, students, onClose }) {
  const bucket = BUCKETS.find((b) => b.id === bucketId);
  // All selected by default; remounted (via key) when the bucket changes.
  const [selected, setSelected] = useState(() => new Set(students.map((s) => s.id)));
  const allChecked = students.length > 0 && students.every((s) => selected.has(s.id));
  const selectedCount = students.filter((s) => selected.has(s.id)).length;

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
    textAlign: "left", fontSize: 12, fontWeight: 700, color: T.textHigh,
    padding: "9px 12px", background: "#fff", borderBottom: `1px solid ${T.border}`,
    position: "sticky", top: 0,
  };
  const td = { padding: "8px 12px", fontSize: 13, color: T.textLow };

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, background: "#fff", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
        borderBottom: `1px solid ${T.border}`, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textHigh }}>
          {bucket.panel}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: T.textLow, background: T.rowStripe,
          borderRadius: 999, padding: "2px 10px",
        }}>
          {students.length}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={sendEmail}
            disabled={selectedCount === 0}
            style={{
              fontFamily: T.font, cursor: selectedCount === 0 ? "default" : "pointer",
              background: selectedCount === 0 ? "#e6e7ec" : T.action,
              color: selectedCount === 0 ? T.textMuted : "#fff",
              border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12.5, fontWeight: 700,
              boxShadow: selectedCount === 0 ? "none" : "0 2px 4px rgba(0,52,99,0.10)",
            }}
          >
            ✉ Email Selected ({selectedCount})
          </button>
          <button
            onClick={onClose}
            title="Clear selection"
            style={{
              fontFamily: T.font, cursor: "pointer", background: "none", border: "none",
              color: T.textMuted, fontSize: 14, padding: 2,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 36 }}>
                <input type="checkbox" checked={allChecked} onChange={onToggleAll} style={{ accentColor: T.action, cursor: "pointer" }} />
              </th>
              <th style={th}>Student Name ⌄</th>
              <th style={th}>Activities Completed ⌄</th>
              <th style={th}>Avg. Correctness</th>
              <th style={th}>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? T.rowStripe : "#fff" }}>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => onToggle(s.id)}
                    style={{ accentColor: T.action, cursor: "pointer" }}
                  />
                </td>
                <td style={{ ...td, fontWeight: 600, color: T.textHigh }}>{s.name}</td>
                <td style={td}>
                  <strong>{s.attempted} of {objective.activitiesCount}</strong>
                  <span style={{ color: T.textMuted, marginLeft: 6 }}>
                    ({Math.round((s.attempted / objective.activitiesCount) * 100)}%)
                  </span>
                </td>
                <td style={td}>{s.correctness === null ? "—" : `${s.correctness}%`}</td>
                <td style={td}>{s.lastActivity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insight strip — only facts computable from the data
// ---------------------------------------------------------------------------

function ActionButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: T.font, cursor: "pointer", flexShrink: 0,
        background: "#fff", border: `1px solid ${T.action}`, color: T.action,
        borderRadius: 6, padding: "4px 12px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// Each insight carries its action — instructors act where they discover the problem.
function InsightStrip({ objective, roster, onViewStruggling, onReviewActivity, onEmailStruggling }) {
  const lowCount = roster.filter((s) => s.bucket === "low").length;
  const lowPct = Math.round((lowCount / TOTAL_STUDENTS) * 100);
  const threshold = Math.ceil(objective.activitiesCount / 3);
  const lowAttempts = roster.filter((s) => s.attempted <= threshold).length;
  const weakest = objective.activities
    ? objective.activities.reduce((min, a) => (a.correctness < min.correctness ? a : min))
    : null;

  const insights = [
    lowCount > 0 && {
      text: <>{lowCount} of {TOTAL_STUDENTS} students ({lowPct}%) are struggling with this objective.</>,
      action: { label: "View Students", onClick: onViewStruggling },
    },
    weakest && {
      text: <>Lowest-performing activity: <ActivityLink name={weakest.name} onNavigate={onReviewActivity} /> — {weakest.correctness}% correctness, {weakest.completion}% completion.</>,
      action: { label: "Review Activity", onClick: onReviewActivity },
    },
    lowAttempts > 0 && {
      text: <>{lowAttempts} students completed {threshold} or fewer of the {objective.activitiesCount} related activities.</>,
      action: { label: "✉ Email Students", onClick: onEmailStruggling },
    },
  ].filter(Boolean);

  if (insights.length === 0) return null;

  return (
    <div style={{
      background: T.tableHover, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.action}`,
      borderRadius: 6, padding: "12px 16px",
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textHigh, marginBottom: 10 }}>
        What's driving this estimate
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: T.textMuted }}>•</span>
            <span style={{ fontSize: 12.5, color: T.textLow, lineHeight: 1.5, flex: 1 }}>{ins.text}</span>
            <ActionButton onClick={ins.action.onClick}>{ins.action.label}</ActionButton>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-objectives table
// ---------------------------------------------------------------------------

function SubObjectivesTable({ subObjectives, onViewActivities, defaultExpandAll = false }) {
  const [expanded, setExpanded] = useState(
    () => new Set(defaultExpandAll ? subObjectives.map((_, i) => i) : []),
  );
  const toggle = (i) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const th = {
    textAlign: "left", fontSize: 12, fontWeight: 700, color: T.textHigh,
    padding: "9px 12px", borderBottom: `1px solid ${T.border}`, background: "#fff",
  };
  const td = { padding: "10px 12px", fontSize: 13, color: T.textLow, verticalAlign: "middle" };

  if (subObjectives.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: "italic", padding: "4px 2px" }}>
        This objective has no sub-objectives. Activity-level details are available in the Scored Activities tab.
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 28 }} />
            <th style={th}>Sub-objective ⌄</th>
            <th style={{ ...th, width: 170 }}>Class Proficiency ⌄</th>
            <th style={{ ...th, width: 170 }}>Proficiency Distribution</th>
            <th style={{ ...th, width: 130 }}>Related Activities</th>
          </tr>
        </thead>
        <tbody>
          {subObjectives.map((sub, i) => {
            const lowN = sub.dist[1];
            const open = expanded.has(i);
            const weakest = sub.relatedActivities.reduce((min, a) => (a.correctness < min.correctness ? a : min));
            return (
              <SubObjectiveRows
                key={sub.title}
                sub={sub} index={i} open={open} lowN={lowN} weakest={weakest}
                onToggle={() => toggle(i)}
                td={td}
                onViewActivities={onViewActivities}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubObjectiveRows({ sub, index, open, lowN, weakest, onToggle, td, onViewActivities }) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ background: open ? T.tableSelect : index % 2 === 0 ? T.rowStripe : "#fff", cursor: "pointer" }}
      >
        <td style={{ ...td, color: T.textMuted, fontSize: 10 }}>{open ? "⌃" : "⌄"}</td>
        <td style={{ ...td, fontWeight: 600, color: T.textHigh, lineHeight: 1.45 }}>{sub.title}</td>
        <td style={td}>
          <Chip label={sub.chip} scope="Class-level status for this sub-objective." />
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
            {lowN} of {TOTAL_STUDENTS} students struggling
          </div>
        </td>
        <td style={td}><MiniDistBar dist={sub.dist} /></td>
        <td style={td}>
          <button
            title={open ? "Hide this sub-objective's activities" : "View this sub-objective's activities"}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              fontFamily: T.font, cursor: "pointer",
              background: open ? T.tableSelect : "#fff",
              border: `1px solid ${T.action}`, color: T.action, borderRadius: 999,
              padding: "2px 11px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
            }}
          >
            {sub.relatedActivities.length} {open ? "▲" : "▼"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            <div style={{ padding: "10px 14px 14px 40px", background: "#fcfdff", borderTop: `1px solid ${T.border}` }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase",
                letterSpacing: 0.5, marginBottom: 8,
              }}>
                Activities contributing to this estimate
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {sub.relatedActivities.map((a) => {
                  const isWeakest = a === weakest;
                  return (
                    <div key={a.name} style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 12.5 }}>
                      <span style={{ color: T.textMuted }}>•</span>
                      <ActivityLink name={a.name} onNavigate={onViewActivities} style={{ minWidth: 200 }} />
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, padding: "1px 8px", borderRadius: 999,
                        background: "#e6e7ec", color: T.textLow,
                      }}>
                        {a.type}
                      </span>
                      <span style={{ color: T.textLow }}>{a.completion}% completion</span>
                      <span style={{ color: T.textMuted }}>·</span>
                      <span style={{ color: isWeakest ? T.danger : T.textLow, fontWeight: isWeakest ? 700 : 400 }}>
                        {a.correctness}% correctness
                      </span>
                      {isWeakest && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: T.danger, border: `1px solid ${T.danger}`,
                          borderRadius: 999, padding: "0px 8px", textTransform: "uppercase", letterSpacing: 0.3,
                        }}>
                          Weakest
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Learning objective row (collapsed + expanded)
// ---------------------------------------------------------------------------

function ObjectiveRow({ objective, expanded, onToggleExpand, selectedBucket, onSelectBucket, onViewActivities }) {
  const roster = ROSTERS[objective.id];
  const [showHowEstimated, setShowHowEstimated] = useState(false);

  const bucketStudents = useMemo(
    () => (selectedBucket ? roster.filter((s) => s.bucket === selectedBucket) : []),
    [roster, selectedBucket],
  );

  const openStudents = () => {
    if (!expanded) onToggleExpand();
    onSelectBucket("low");
  };
  const openSubObjectives = () => {
    if (!expanded) onToggleExpand();
  };
  const openActivities = () => {
    onViewActivities(objective.id);
  };

  // Clickable summary pills — each jumps to the matching detail.
  const strugglingN = roster.filter((s) => s.bucket === "low").length;
  const pills = [
    strugglingN > 0 && { text: `${strugglingN} students struggling`, bg: T.dangerFill, color: T.danger, onClick: openStudents },
    objective.subObjectives.length > 0 && { text: `${objective.subObjectives.length} sub-objectives`, bg: "#e6e7ec", color: T.textLow, onClick: openSubObjectives },
    { text: `${objective.activitiesCount} activities`, bg: "#e6e7ec", color: T.textLow, onClick: openActivities },
  ].filter(Boolean);

  const td = { padding: "13px 14px", fontSize: 13, color: T.textLow, verticalAlign: "middle" };

  return (
    <>
      {/* collapsed row */}
      <tr
        onClick={onToggleExpand}
        style={{
          background: expanded ? T.tableSelect : "#fff",
          borderTop: `1px solid ${T.border}`, cursor: "pointer",
        }}
      >
        <td style={{ ...td, width: 34, color: T.textMuted, fontSize: 11 }}>
          {expanded ? "⌃" : "⌄"}
        </td>
        <td style={{ ...td, fontWeight: 600, color: T.textHigh, lineHeight: 1.45 }}>
          {objective.title}
          {/* clickable summary pills — quick overview, each jumps to its detail */}
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {pills.map((p) => (
              <button
                key={p.text}
                onClick={(e) => { e.stopPropagation(); p.onClick(); }}
                style={{
                  fontFamily: T.font, cursor: "pointer", border: "none",
                  fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 999,
                  background: p.bg, color: p.color, whiteSpace: "nowrap",
                }}
              >
                {p.text}
              </button>
            ))}
          </div>
        </td>
        <td style={{ ...td, width: 150 }}>
          <Chip label={objective.chip} scope="Class-level status for this objective." />
        </td>
        <td style={{ ...td, width: 180 }}><MiniDistBar dist={objective.dist} /></td>
        <td style={{ ...td, width: 130 }}>
          <button
            title="View the activities supporting this objective's sub-objectives"
            onClick={(e) => {
              e.stopPropagation();
              openActivities();
            }}
            style={{
              fontFamily: T.font, cursor: "pointer", background: "#fff",
              border: `1px solid ${T.action}`, color: T.action, borderRadius: 999,
              padding: "3px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            }}
          >
            {objective.activitiesCount} ↗
          </button>
        </td>
      </tr>

      {/* expanded view */}
      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0, borderTop: `1px solid ${T.border}` }}>
            <div style={{
              padding: "18px 24px 22px 44px", background: "#fbfcfe",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              {/* header + how-estimated disclosure */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textHigh }}>
                    Estimated Learning: {TOTAL_STUDENTS} Students
                  </span>
                  <LinkButton onClick={() => setShowHowEstimated((v) => !v)} style={{ fontSize: 12, fontWeight: 600 }}>
                    ⓘ How is proficiency estimated?
                  </LinkButton>
                </div>
                {showHowEstimated && (
                  <div style={{
                    marginTop: 8, fontSize: 12.5, color: T.textLow, lineHeight: 1.55,
                    background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 14px", maxWidth: 640,
                  }}>
                    Proficiency is estimated from <strong>activity completion</strong>, <strong>correctness</strong>, and
                    whether students have had <strong>multiple opportunities to demonstrate learning</strong>.
                    <ul style={{ margin: "8px 0 0", padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {BUCKETS.map((b) => (
                        <li key={b.id}>
                          <strong>{b.label}</strong> — {b.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <InsightStrip
                objective={objective}
                roster={roster}
                onViewStruggling={() => onSelectBucket("low")}
                onReviewActivity={openActivities}
                onEmailStruggling={() => onSelectBucket("low")}
              />

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

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textHigh, marginBottom: 8 }}>
                  Sub-objectives
                </div>
                <SubObjectivesTable
                  subObjectives={objective.subObjectives}
                  onViewActivities={() => onViewActivities(objective.id)}
                />
              </div>

              {objective.trend && <TrendSection trend={objective.trend} />}
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

function AnswerDistribution({ answers, highlightWrong }) {
  const total = answers.reduce((s, a) => s + a.count, 0) || 1;
  const topWrong = highlightWrong
    ? answers.filter((a) => !a.correct).reduce((max, a) => (!max || a.count > max.count ? a : max), null)
    : null;
  const neutralBar = "#b8bac4";

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

function ActivityQuestionRow({ item, index, open, onToggle }) {
  const weak = isWeakActivity(item.correctPct);
  const isMultiInput = item.type === "multi-input";
  const td = { padding: "11px 12px", fontSize: 13, color: T.textLow, verticalAlign: "top" };
  const wrongAnswers = item.answers?.filter((a) => !a.correct) ?? [];
  const topWrong = wrongAnswers.length
    ? wrongAnswers.reduce((max, a) => (a.count > max.count ? a : max), wrongAnswers[0])
    : null;

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          background: open ? T.rowStripe : index % 2 === 0 ? "#fff" : T.rowStripe,
          cursor: "pointer",
        }}
      >
        <td style={{ ...td, width: 36, color: T.textMuted, fontSize: 11 }}>
          {open ? "⌃" : "⌄"}
        </td>
        <td style={{ ...td, width: 40, fontWeight: 700, color: T.textHigh }}>{item.id}</td>
        <td style={td}>
          <div style={{ fontSize: 11.5, color: T.textMuted, fontFamily: "monospace", marginBottom: 3 }}>
            {item.poolId}:
          </div>
          <div style={{ fontWeight: 600, color: T.textHigh, lineHeight: 1.45 }}>{item.stem}</div>
          {(isMultiInput || weak) && (
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4 }}>
              {isMultiInput && "Multi-input"}
              {isMultiInput && weak && " · "}
              {weak && <span style={{ color: T.danger, fontWeight: 600 }}>Needs attention</span>}
            </div>
          )}
        </td>
        <td style={{ ...td, maxWidth: 280 }}>
          {item.learningObjectives.length === 0 ? (
            <span style={{ color: T.textMuted, fontStyle: "italic" }}>—</span>
          ) : (
            item.learningObjectives.map((lo) => (
              <div key={lo} style={{ fontSize: 12.5, lineHeight: 1.45, marginBottom: 4 }}>{lo}</div>
            ))
          )}
        </td>
        <td style={{ ...td, width: 90, fontWeight: 700, textAlign: "center" }}>{item.attempts}</td>
        <td style={{
          ...td, width: 90, fontWeight: 700, textAlign: "center",
          color: weak ? T.danger : T.textHigh,
        }}>
          {item.correctPct}%
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: "#fff" }}>
            <div style={{ padding: "14px 16px 16px 52px", borderTop: `1px solid ${T.border}` }}>
              {isMultiInput ? (
                <MultiInputAnalysis item={item} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24 }}>
                  <div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase",
                      letterSpacing: 0.5, marginBottom: 10,
                    }}>
                      Answer distribution
                    </div>
                    <AnswerDistribution answers={item.answers} highlightWrong={weak} />
                  </div>
                  <div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase",
                      letterSpacing: 0.5, marginBottom: 10,
                    }}>
                      Details
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: T.textMuted }}>
                      <div>{item.details.uniqueStudents} unique students attempted</div>
                      <div>{item.details.avgAttempts} avg attempts per student</div>
                      <div>{item.details.skipped} skipped / no answer</div>
                      {weak && topWrong && (
                        <div style={{ marginTop: 6, color: T.danger }}>
                          Most common wrong answer: “{topWrong.text}”
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ObjectiveActivitiesView({ objective, onBack }) {
  const items = getActivityItems(objective);
  const [filter, setFilter] = useState("all");
  const weakItems = items.filter((i) => isWeakActivity(i.correctPct));
  const visibleItems = filter === "weak" ? weakItems : items;

  const [expanded, setExpanded] = useState(() => new Set());

  const weakCount = weakItems.length;

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const th = {
    textAlign: "left", fontSize: 12.5, fontWeight: 700, color: T.textHigh,
    padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: "#fff",
  };

  const filterBtn = (id, label) => {
    const active = filter === id;
    const isWeakFilter = id === "weak";
    return (
      <button
        onClick={() => setFilter(id)}
        style={{
          fontFamily: T.font, cursor: "pointer", fontSize: 12.5, fontWeight: active ? 700 : 400,
          padding: "6px 14px", borderRadius: 6,
          border: isWeakFilter
            ? `1px solid ${active ? T.danger : "#f0a6ab"}`
            : `1px solid ${T.border}`,
          background: isWeakFilter && active ? T.dangerFill : active ? T.rowStripe : "#fff",
          color: isWeakFilter ? T.danger : T.textLow,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px 64px" }}>
      <div style={{ background: T.bgSecondary, borderRadius: 16, boxShadow: T.shadow, padding: 24 }}>
        <LinkButton onClick={onBack} style={{ fontSize: 13, marginBottom: 16, display: "inline-block" }}>
          ‹ Back to Learning Objectives
        </LinkButton>

        <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: T.textHigh, lineHeight: 1.4, maxWidth: 900 }}>
          {objective.title}
        </h2>

        {weakCount > 0 && filter !== "weak" && (
          <div style={{
            border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 14px", marginBottom: 14,
            fontSize: 12.5, color: T.textMuted,
          }}>
            <span style={{ color: T.danger, fontWeight: 600 }}>{weakCount}</span>
            {" "}question{weakCount === 1 ? "" : "s"} below {WEAK_CORRECT_THRESHOLD}% correct.
            {" "}Use <strong style={{ color: T.textLow, fontWeight: 600 }}>Needs attention</strong> to focus.
          </div>
        )}

        {items.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            {filterBtn("all", `All questions (${items.length})`)}
            {filterBtn("weak", `Needs attention (${weakCount})`)}
            {filter === "weak" && (
              <span style={{ fontSize: 12, color: T.textMuted, marginLeft: 4 }}>
                Sorted by lowest % correct
              </span>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic" }}>
            Activity-level details for this objective are available in the Scored Activities tab.
          </div>
        ) : visibleItems.length === 0 ? (
          <div style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic", padding: 16 }}>
            No questions match this filter.
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 36 }} />
                  <th style={{ ...th, width: 40 }}># ⌄</th>
                  <th style={th}>Question Stem ⌄</th>
                  <th style={{ ...th, width: 280 }}>Learning Objectives ⌄</th>
                  <th style={{ ...th, width: 90, textAlign: "center" }}>Attempts ⌄</th>
                  <th style={{ ...th, width: 90, textAlign: "center" }}>% Correct ⌄</th>
                </tr>
              </thead>
              <tbody>
                {[...visibleItems]
                  .sort((a, b) => filter === "weak" ? a.correctPct - b.correctPct : a.id - b.id)
                  .map((item, i) => (
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
        )}
      </div>
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
    support: { filter: "Needs Attention", lo: "lo-density", bucket: "low" },
    objectives: { filter: "Needs Attention" },
    ontrack: { filter: "On Track", lo: "lo-sigfigs", bucket: "high" },
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
    setBucketSelections(c.lo ? { [c.lo]: c.bucket } : {});
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
  const lowSubObjectives = 5;

  // Student-level counts from the top-priority objective's roster.
  const priorityRoster = ROSTERS["lo-density"];
  const strugglingStudents = priorityRoster.filter((s) => s.bucket === "low").length;
  const strugglingPct = Math.round((strugglingStudents / TOTAL_STUDENTS) * 100);
  const onTrackStudents = priorityRoster.filter((s) => s.bucket === "high").length;
  const watchStudents = priorityRoster.filter((s) => s.bucket === "medium").length;

  const th = {
    textAlign: "left", fontSize: 12.5, fontWeight: 700, color: T.textHigh,
    padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: "#fff",
  };

  const summaryCard = (active) => ({
    border: active ? `1.5px solid ${T.action}` : `1px solid ${T.border}`,
    background: active ? T.tableSelect : "#fff",
    borderRadius: 8, padding: active ? "11.5px 17.5px" : "12px 18px", minWidth: 180, cursor: "pointer",
  });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px 64px" }}>
      <div style={{ ...{ background: T.bgSecondary, borderRadius: 16, boxShadow: T.shadow }, padding: 24 }}>
        {/* card header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.textHigh }}>Learning Objectives</h2>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ marginLeft: "auto", color: T.action, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
          >
            Download CSV ⬇
          </a>
        </div>

        {/* overview cards — filters over the objectives below */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          <div
            style={summaryCard(activeCard === "support")}
            onClick={() => toggleCard("support")}
            title="Filter to objectives needing attention and view the struggling students"
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textHigh }}>🚨 Students Needing Support</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: T.textHigh }}>{strugglingStudents}</span>
              <span style={{ fontSize: 12, color: T.textMuted, marginLeft: 6 }}>students</span>
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {activeCard === "support"
                ? <span style={{ color: T.action, fontWeight: 700 }}>Filtering · click to clear</span>
                : `${strugglingPct}% of class`}
            </div>
          </div>
          <div
            style={summaryCard(activeCard === "objectives")}
            onClick={() => toggleCard("objectives")}
            title="Filter the table to objectives needing attention"
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textHigh }}>⚠️ Objectives Needing Attention</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: T.textHigh }}>{lowOutcomes}</span>
              <span style={{ fontSize: 12, color: T.textMuted, marginLeft: 6 }}>objective{lowOutcomes === 1 ? "" : "s"}</span>
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {activeCard === "objectives"
                ? <span style={{ color: T.action, fontWeight: 700 }}>Filtering · click to clear</span>
                : `${lowSubObjectives} sub-objectives`}
            </div>
          </div>
          <div
            style={summaryCard(activeCard === "ontrack")}
            onClick={() => toggleCard("ontrack")}
            title="Filter to objectives on track and view those students"
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textHigh }}>📈 Students On Track</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: T.textHigh }}>{onTrackStudents + watchStudents}</span>
              <span style={{ fontSize: 12, color: T.textMuted, marginLeft: 6 }}>students</span>
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {activeCard === "ontrack"
                ? <span style={{ color: T.action, fontWeight: 700 }}>Filtering · click to clear</span>
                : `${onTrackStudents} on track · ${watchStudents} to watch`}
            </div>
          </div>
        </div>

        {/* filter bar */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14,
          border: `1px solid ${T.border}`, borderRadius: 8, padding: 8,
        }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍︎ Search"
            style={{
              fontFamily: T.font, fontSize: 13, padding: "6px 10px", width: 180,
              border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", color: T.textLow,
            }}
          />
          <select
            value={proficiencyFilter}
            onChange={(e) => { setProficiencyFilter(e.target.value); setActiveCard(null); }}
            style={{
              fontFamily: T.font, fontSize: 13, padding: "6px 10px",
              border: `1px solid ${T.border}`, borderRadius: 6, color: T.textLow, background: "#fff",
            }}
          >
            <option value="All">Proficiency</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="Watch">Watch</option>
            <option value="On Track">On Track</option>
            <option value="Not enough data">Not enough data</option>
          </select>
          <button
            onClick={() => { setSearch(""); setProficiencyFilter("All"); setActiveCard(null); setBucketSelections({}); }}
            style={{
              fontFamily: T.font, fontSize: 13, color: T.textLow, background: "none",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            🗑 Clear All Filters
          </button>
        </div>

        {/* instructional banner — what this page is for */}
        <div style={{
          border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.action}`,
          background: T.tableHover, borderRadius: 6, padding: "8px 14px", marginBottom: 14,
          fontSize: 12.5, color: T.textLow, lineHeight: 1.6,
        }}>
          <strong style={{ color: T.textHigh }}>Use learning objectives to identify:</strong>{" "}
          • which students need support &nbsp;• which concepts students struggle with&nbsp; • and which activities may need review.
        </div>

        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 6 }}>
          Sorted by priority — objectives needing attention first
        </div>

        {/* objectives table */}
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 34 }} />
                <th style={th}>Learning Objective ⌄</th>
                <th style={{ ...th, width: 150 }}>ⓘ Student Proficiency ⌄</th>
                <th style={{ ...th, width: 180 }}>Proficiency Distribution</th>
                <th style={{ ...th, width: 130 }}>Related Activities</th>
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
              {rows.map((lo) => (
                <ObjectiveRow
                  key={lo.id}
                  objective={lo}
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
