// Pure rep-counting maths for the camera coach: MediaPipe pose landmarks → joint signals →
// repetitions. No browser APIs here, so it can run anywhere.

export type Landmark = { x: number; y: number; z?: number; visibility?: number };

// MediaPipe Pose landmark indices.
const L = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 };
const R = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 };

export type SignalId = "knee" | "kneeMin" | "elbow" | "elbowMin" | "hip" | "arms" | "hipY" | "kneeAlt";

type Pattern = {
  signal: SignalId | "auto" | "hold";
  perCycle?: number; // alternating moves (high knees) count each leg
  cue?: (bottom: number) => string | null; // looked at the lowest point of each rep
};

// Keyword → how to watch the move. First match wins, so specific names go first.
const PATTERNS: [RegExp, Pattern][] = [
  [/plank|hold|wall sit|hollow|hang|l-sit|superman|isometric/, { signal: "hold" }],
  [/burpee|tuck jump|broad jump/, { signal: "hipY" }],
  [/jumping jack|star jump|\bjacks?\b|seal jack/, { signal: "arms" }],
  [/high knee|march|mountain climb|running in place|butt kick|skater/, { signal: "kneeAlt", perCycle: 2 }],
  [/lunge|split squat|step[- ]?up|curtsy/, { signal: "kneeMin", cue: (b) => (b > 120 ? "Drop the back knee lower" : null) }],
  [/squat|sit to stand|chair pose/, { signal: "knee", cue: (b) => (b > 115 ? "Sit a little deeper" : null) }],
  [/push[- ]?up|press[- ]?up|\bdips?\b/, { signal: "elbow", cue: (b) => (b > 110 ? "Chest closer to the floor" : null) }],
  [/curl/, { signal: "elbowMin" }],
  [/shoulder press|overhead|military|pike|arnold/, { signal: "elbow" }],
  [/raise|\by[- ]?raise|arm circle|t-?raise/, { signal: "arms" }],
  [/crunch|sit[- ]?up|v[- ]?up|leg raise|toe touch|jackknife|russian twist|flutter/, { signal: "hip" }],
  [/bridge|hip thrust|deadlift|\brdl\b|good morning|\brow\b|bird dog|donkey kick|fire hydrant/, { signal: "hip" }],
];

export function patternFor(exerciseName: string): Pattern {
  const name = exerciseName.toLowerCase();
  return PATTERNS.find(([re]) => re.test(name))?.[1] ?? { signal: "auto" };
}

const AUTO_SIGNALS: SignalId[] = ["knee", "elbow", "hip", "arms", "hipY", "kneeAlt"];

// Which joints a signal reads, so the overlay can highlight them.
export const SIGNAL_JOINTS: Record<SignalId, number[]> = {
  knee: [23, 25, 27, 24, 26, 28],
  kneeMin: [23, 25, 27, 24, 26, 28],
  elbow: [11, 13, 15, 12, 14, 16],
  elbowMin: [11, 13, 15, 12, 14, 16],
  hip: [11, 23, 25, 12, 24, 26],
  arms: [23, 11, 13, 24, 12, 14],
  hipY: [23, 24],
  kneeAlt: [25, 26],
};

const seen = (p: Landmark | undefined) => !!p && (p.visibility ?? 1) > 0.5;

// Angle at b (degrees) in screen space; `aspect` (width / height) undoes the normalised x squish.
function angle(a: Landmark, b: Landmark, c: Landmark, aspect: number) {
  const v1 = { x: (a.x - b.x) * aspect, y: a.y - b.y };
  const v2 = { x: (c.x - b.x) * aspect, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function sideAngles(lm: Landmark[], aspect: number, a: keyof typeof L, b: keyof typeof L, c: keyof typeof L) {
  const out: number[] = [];
  for (const s of [L, R]) if (seen(lm[s[a]]) && seen(lm[s[b]]) && seen(lm[s[c]])) out.push(angle(lm[s[a]], lm[s[b]], lm[s[c]], aspect));
  return out;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const min = (xs: number[]) => (xs.length ? Math.min(...xs) : null);

export function readSignal(id: SignalId, lm: Landmark[], aspect: number): number | null {
  switch (id) {
    case "knee":
      return avg(sideAngles(lm, aspect, "hip", "knee", "ankle"));
    case "kneeMin":
      return min(sideAngles(lm, aspect, "hip", "knee", "ankle"));
    case "elbow":
      return avg(sideAngles(lm, aspect, "shoulder", "elbow", "wrist"));
    case "elbowMin":
      return min(sideAngles(lm, aspect, "shoulder", "elbow", "wrist"));
    case "hip":
      return avg(sideAngles(lm, aspect, "shoulder", "hip", "knee"));
    case "arms":
      return avg(sideAngles(lm, aspect, "hip", "shoulder", "elbow"));
    case "hipY":
      return seen(lm[L.hip]) && seen(lm[R.hip]) ? (lm[L.hip].y + lm[R.hip].y) / 2 : null;
    case "kneeAlt":
      return seen(lm[L.knee]) && seen(lm[R.knee]) ? lm[L.knee].y - lm[R.knee].y : null;
  }
}

const isPosition = (id: SignalId) => id === "hipY" || id === "kneeAlt";

// Is enough of the body in frame to coach? Shoulders and hips at least.
export function bodyVisible(lm: Landmark[] | undefined) {
  return !!lm && [L.shoulder, R.shoulder, L.hip, R.hip].every((i) => seen(lm[i]));
}

type RepEvent = { bottom: number };

// Counts full low→high cycles of one signal with adaptive hysteresis: thresholds sit at
// 35% / 65% of the range seen over the last few seconds, so it works for any body size,
// camera distance or move speed, and ignores jitter smaller than `minRange`.
export class RepCounter {
  reps = 0;
  private samples: { t: number; v: number }[] = [];
  private smooth: number | null = null;
  private phase: "high" | "low" | null = null;
  private lowest = Infinity;
  private lastRepAt = -Infinity;

  constructor(
    private minRange: number,
    private windowMs = 5000,
    private minRepMs = 450,
  ) {}

  push(t: number, value: number): RepEvent | null {
    this.smooth = this.smooth === null ? value : this.smooth * 0.5 + value * 0.5;
    const v = this.smooth;
    this.samples.push({ t, v });
    while (this.samples.length && this.samples[0].t < t - this.windowMs) this.samples.shift();

    let lo = Infinity;
    let hi = -Infinity;
    for (const s of this.samples) {
      if (s.v < lo) lo = s.v;
      if (s.v > hi) hi = s.v;
    }
    const range = hi - lo;
    if (range < this.minRange) return null;

    if (v < lo + range * 0.35) {
      this.phase = "low";
      this.lowest = Math.min(this.lowest, v);
    } else if (v > hi - range * 0.35) {
      const finished = this.phase === "low" && t - this.lastRepAt >= this.minRepMs;
      this.phase = "high";
      if (finished) {
        this.reps++;
        this.lastRepAt = t;
        const bottom = this.lowest;
        this.lowest = Infinity;
        return { bottom };
      }
    }
    return null;
  }

  // Signal currently between thresholds → 0..1 progress through the rep (for the UI bar).
  get depth() {
    if (this.samples.length < 2 || this.smooth === null) return 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of this.samples) {
      lo = Math.min(lo, s.v);
      hi = Math.max(hi, s.v);
    }
    return hi - lo < this.minRange ? 0 : 1 - (this.smooth - lo) / (hi - lo);
  }
}

// Watches one exercise: picks the right signal(s), counts reps, and reports form cues.
export class MoveTracker {
  readonly pattern: Pattern;
  private counters: Map<SignalId, RepCounter>;
  private active: SignalId | null;

  constructor(exerciseName: string) {
    this.pattern = patternFor(exerciseName);
    const ids = this.pattern.signal === "auto" ? AUTO_SIGNALS : this.pattern.signal === "hold" ? [] : [this.pattern.signal];
    this.counters = new Map(ids.map((id) => [id, new RepCounter(isPosition(id) ? 0.06 : 35)]));
    this.active = ids.length === 1 ? ids[0] : null;
  }

  get isHold() {
    return this.pattern.signal === "hold";
  }

  // The signal being followed (in auto mode: whichever one has counted the most).
  get signal(): SignalId | null {
    return this.active;
  }

  get reps() {
    const c = this.active && this.counters.get(this.active);
    return (c ? c.reps : 0) * (this.pattern.perCycle ?? 1);
  }

  get depth() {
    const c = this.active && this.counters.get(this.active);
    return c ? c.depth : 0;
  }

  update(t: number, lm: Landmark[], aspect: number): { rep: boolean; cue: string | null } {
    let rep = false;
    let cue: string | null = null;
    for (const [id, counter] of this.counters) {
      const v = readSignal(id, lm, aspect);
      if (v === null) continue;
      const ev = counter.push(t, v);
      if (!ev) continue;
      // In auto mode the first signal to complete a rep, then whichever leads, drives the count.
      const lead = this.active ? this.counters.get(this.active)!.reps : -1;
      if (!this.active || counter.reps > lead) this.active = id;
      if (id === this.active) {
        rep = true;
        cue = this.pattern.cue?.(ev.bottom) ?? null;
      }
    }
    return { rep, cue };
  }
}
