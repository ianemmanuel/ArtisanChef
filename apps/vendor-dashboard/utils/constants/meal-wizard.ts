

// 1️⃣ Step Order — Synchronized across Wizard, Zustand store, and UI
export const STEP_ORDER = [
  "basic",
  "media",
  "categories",
  "variants",
  "addons",
  "review",
] as const;

// 2️⃣ StepKey — Union type inferred from STEP_ORDER
export type StepKey = typeof STEP_ORDER[number];

// 3️⃣ Step labels (UI helpers)
export const STEP_LABELS: Record<StepKey, string> = {
  basic: "Basic",
  media: "Media",
  categories: "Categories",
  variants: "Variants",
  addons: "Addons",
  review: "Review",
};
