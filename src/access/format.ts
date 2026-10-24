import type { AccessCountry } from "./types";

export const INK = "#1c1916";
export const MORE = "#5E3C99";
export const LESS = "#E66101";
export const NEAR = "#BDBDBD";
export const MEETS = "#0072B2";
export const ABOVE = "#D55E00";
export const MISSING = "#E0E0E0";
export const CURVE = "#4a453e";

export const GAP_BINS: { label: string; color: string; test: (value: number) => boolean }[] = [
  { label: "20+ points less", color: "#B35806", test: (value) => value <= -20 },
  { label: "10 to 20 less", color: "#F1A340", test: (value) => value <= -10 },
  { label: "5 to 10 less", color: "#FEE0B6", test: (value) => value <= -5 },
  { label: "within 5", color: "#F7F7F7", test: (value) => value < 5 },
  { label: "5 to 10 more", color: "#D8DAEB", test: (value) => value < 10 },
  { label: "10 to 20 more", color: "#998EC3", test: (value) => value < 20 },
  { label: "20+ more", color: "#542788", test: () => true },
];

export function gapColor(value: number): string {
  return GAP_BINS.find((bin) => bin.test(value))?.color ?? MISSING;
}

export function yearLabel(year: number | null): string {
  if (year == null) return "older than 2024, exact year not stated";
  return String(year);
}

export function ituLabel(flag: string): string {
  switch (flag) {
    case "yes":
      return "ITU marks this as an estimate";
    case "likely":
      return "Likely an ITU estimate: the latest official figure is older than 2024";
    case "no":
      return "ITU does not mark this as an estimate";
    case "unknown":
      return "The World Bank copy does not state an ITU estimate flag";
    case "not_marked":
      return "ITU does not mark this as an estimate";
    case "n/a":
      return "Not an ITU figure";
    case "composite":
      return "ITU composite";
    default:
      return "Estimate flag not stated";
  }
}

export function fmtPct(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function fmtBb(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtGdp(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtPoints(value: number): string {
  const text = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (value > 0) return `+${text}`;
  if (value < 0) return `-${text}`;
  return text;
}

export function scatterColor(country: AccessCountry, costMode: boolean): string {
  if (costMode) {
    if (country.bb == null) return NEAR;
    return country.bb <= 2 ? MEETS : ABOVE;
  }
  if (country.gap == null) return NEAR;
  if (country.gap >= 10) return MORE;
  if (country.gap <= -10) return LESS;
  return NEAR;
}

export function symbolSize(pop: number | null, maxPop: number): number {
  if (pop == null || maxPop <= 0) return 8;
  const t = Math.sqrt(pop / maxPop);
  return Math.max(7, Math.min(32, 7 + t * 25));
}

export type Fact = { label: string; text: string };

function valued(text: string, year: number | null, flag: string): string {
  return `${text}. Year: ${yearLabel(year)}. ${ituLabel(flag)}.`;
}

export function factLines(country: AccessCountry): Fact[] {
  const use =
    country.use == null
      ? "No figure."
      : valued(`${fmtPct(country.use)}% of population`, country.useYear, country.useFlag);
  const gdp =
    country.gdp == null
      ? "No figure."
      : valued(`${fmtGdp(country.gdp)} international $ (constant 2021)`, country.gdpYear, country.gdpFlag);
  const pred =
    country.pred == null
      ? "No figure."
      : `${fmtPct(country.pred)}% of population, from the fitted curve. Year: ${yearLabel(country.predYear)}. Calculated on this page.`;
  let gap =
    country.gap == null
      ? "No fitted gap. The curve uses countries with internet use and GDP per person for 2024."
      : valued(`${fmtPoints(country.gap)} percentage points`, country.gapYear, country.gapFlag);
  if (country.use != null && country.use >= 95 && country.gap != null) {
    gap += " Use is at or above 95%, so the gap cannot be large. Use is capped at 100%.";
  }
  let bb = "No figure.";
  if (country.bb != null) {
    const side = country.bb <= 2 ? "At or below the 2% target." : "Above the 2% target.";
    bb = `${valued(`${fmtBb(country.bb)}% of median monthly income`, country.bbYear, country.bbFlag)} ${side}`;
  }
  const lines: Fact[] = [
    { label: "Internet use", text: use },
    { label: "GDP per person", text: gdp },
    { label: "Predicted", text: pred },
    { label: "Gap", text: gap },
    { label: "Home broadband", text: bb },
  ];
  if (!country.onMap) lines.push({ label: "Map", text: "Not drawn on this map." });
  return lines;
}

export function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function tooltipHtml(country: AccessCountry): string {
  const body = factLines(country)
    .map((fact) => `${esc(fact.label)}: ${esc(fact.text)}`)
    .join("<br/>");
  return `<strong>${esc(country.name)}</strong><br/>${body}`;
}
