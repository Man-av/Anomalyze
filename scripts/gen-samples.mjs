/**
 * Generates the seed sample datasets in public/samples/.
 * Seeded PRNG (mulberry32) so output is deterministic and reproducible.
 * Run: node scripts/gen-samples.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "samples");
mkdirSync(OUT, { recursive: true });

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20240826);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const gauss = (mean, sd) => {
  // Box–Muller
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n") + "\n";
}

/* ---------------- 1. Daily sales: time series + spike + correlation --------- */
{
  const headers = ["date", "day_of_week", "units_sold", "revenue", "avg_order_value", "returns"];
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const rows = [];
  const base = new Date(2024, 0, 1);
  const N = 90;
  for (let i = 0; i < N; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const wd = d.getDay();
    const weekend = wd === 0 || wd === 6 ? 1.35 : 1;
    let units = Math.round(gauss(200 * weekend, 22));
    // Planted spike on day 45 (a promo day) — a clear, real anomaly.
    if (i === 45) units = Math.round(units * 4.4);
    units = Math.max(20, units);
    const price = gauss(24.5, 1.1); // tight -> units & revenue strongly correlated
    const revenue = Math.round(units * price * 100) / 100;
    const aov = Math.round((revenue / units) * 100) / 100;
    const returns = Math.max(0, Math.round(units * 0.03 + gauss(0, 1.5)));
    rows.push({
      date: iso(d),
      day_of_week: dow[wd],
      units_sold: units,
      revenue,
      avg_order_value: aov,
      returns,
    });
  }
  writeFileSync(join(OUT, "sales_daily.csv"), toCsv(headers, rows));
}

/* ---------------- 2. Survey: categorical + boolean + text + missing --------- */
{
  const headers = [
    "respondent_id",
    "age",
    "gender",
    "department",
    "tenure_years",
    "satisfaction",
    "would_recommend",
    "comments",
  ];
  const genders = ["Female", "Male", "Male", "Female", "Non-binary", "Prefer not to say"];
  const depts = ["Engineering", "Sales", "Marketing", "Support", "HR"];
  const adjs = ["great", "frustrating", "positive", "mixed", "excellent", "disappointing", "solid"];
  const rows = [];
  const N = 120;
  for (let i = 0; i < N; i++) {
    const age = rnd() < 0.08 ? null : Math.round(gauss(38, 10));
    const tenure = rnd() < 0.05 ? null : Math.round(Math.max(0, gauss(6, 4)) * 10) / 10;
    const sat = 1 + Math.floor(rnd() * 5);
    const dept = pick(depts);
    // Comments present ~30% of the time, varied enough to read as free text.
    const comment =
      rnd() < 0.3
        ? `Overall a ${pick(adjs)} experience working in ${dept}; would ${
            rnd() < 0.5 ? "welcome" : "appreciate"
          } more support here.`
        : null;
    rows.push({
      respondent_id: 1001 + i,
      age: age === null ? null : Math.min(70, Math.max(18, age)),
      gender: pick(genders),
      department: dept,
      tenure_years: tenure,
      satisfaction: sat,
      would_recommend: sat >= 3 ? "true" : "false",
      comments: comment,
    });
  }
  writeFileSync(join(OUT, "survey_responses.csv"), toCsv(headers, rows));
}

/* ---------------- 3. Messy inventory: dupes + missing + mixed + constant ---- */
{
  const headers = [
    "sku",
    "product_name",
    "category",
    "warehouse",
    "quantity",
    "weight",
    "discount_code",
    "last_restock",
  ];
  const cats = ["Electronics", "Home", "Toys", "Garden", "Office"];
  const names = ["Widget", "Gadget", "Gizmo", "Doohickey", "Contraption", "Apparatus"];
  const codes = ["SAVE10", "BULK5", "CLEAR20", "VIP"];
  const rows = [];
  const base = new Date(2024, 2, 1);
  const N = 52;
  for (let i = 0; i < N; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.floor(rnd() * 120));
    // `weight` is intentionally mixed: ~65% numeric, rest junk -> flagged mixed-type.
    let weight;
    const roll = rnd();
    if (roll < 0.65) weight = Math.round(gauss(2.5, 1.2) * 100) / 100;
    else if (roll < 0.83) weight = "unknown";
    else weight = "N/A";
    rows.push({
      sku: `SKU-${String(1000 + i).padStart(4, "0")}`,
      product_name: `${pick(names)} ${pick(["S", "M", "L", "XL"])}`,
      category: pick(cats),
      warehouse: "WH-01", // constant column -> flagged as single-value
      quantity: rnd() < 0.2 ? null : Math.round(Math.max(0, gauss(50, 30))),
      weight,
      discount_code: rnd() < 0.25 ? pick(codes) : null, // mostly empty -> high-null
      last_restock: iso(d),
    });
  }
  // Inject exact duplicate rows to trip the duplicate-row quality penalty.
  for (const idx of [3, 3, 10, 10, 21, 27, 27, 40]) rows.push({ ...rows[idx] });
  writeFileSync(join(OUT, "messy_inventory.csv"), toCsv(headers, rows));
}

console.log("Wrote samples to", OUT);
