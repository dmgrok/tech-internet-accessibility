import type { Country, Headline, Point, WhyCode } from "./types";

export const ACCENT = "#b8431f";
export const INK = "#1c1916";
export const GREY_LINE = "#d2ccc2";
export const EMPTY_LAND = "#e4dfd6";

export const BINS: { label: string; color: string; test: (value: number) => boolean }[] = [
  { label: "under 1 GB", color: "#f6d7c4", test: (value) => value < 1 },
  { label: "1 to 3 GB", color: "#efb48f", test: (value) => value >= 1 && value < 3 },
  { label: "3 to 8 GB", color: "#e08a5d", test: (value) => value >= 3 && value < 8 },
  { label: "8 to 20 GB", color: "#c45c32", test: (value) => value >= 8 && value < 20 },
  { label: "20 to 60 GB", color: "#9a3c1c", test: (value) => value >= 20 && value < 60 },
  { label: "over 60 GB", color: "#5e2412", test: (value) => value >= 60 },
];

export function binColor(value: number): string {
  return BINS.find((bin) => bin.test(value))?.color ?? EMPTY_LAND;
}

export function fmtGb(value: number, unit = true): string {
  const digits = value >= 1 ? 1 : 2;
  const text = value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return unit ? `${text} GB` : text;
}

export function fmtUsd(value: number): string {
  const digits = value >= 1 ? 2 : 3;
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

export function fmtWage(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} USD`;
}

export function fmtShare(value: number): string {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function fmtGap(value: number): string {
  return `${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function axisNum(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 10) return String(Math.round(value));
  if (value >= 1) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
  if (value >= 0.1) return (Math.round(value * 10) / 10).toFixed(1);
  return value.toFixed(2);
}

export function lastPoint(country: Country, metric: "gb" | "price"): Point | null {
  for (let i = country.points.length - 1; i >= 0; i -= 1) {
    if (country.points[i][metric] != null) return country.points[i];
  }
  return null;
}

export function oecdSentence(country: Headline | Country, year: number): string {
  const pct = "oecdPct" in country ? country.oecdPct : null;
  if (pct == null) return "";
  const name = country.name;
  return `${name}'s ILO wage is ${fmtGap(pct)} below the OECD average for ${year}.`;
}

export function italySentence(wage2020: number, wage2021: number): string {
  return `ILO switched Italy to gross pay in 2021: the labour force survey (${fmtWage(wage2020)} in 2020) was replaced by EU-SILC (${fmtWage(wage2021)} in 2021). GB per hour is overstated.`;
}

export function breakSentence(point: Point): string {
  const bits: string[] = [];
  const why: WhyCode[] = point.why;
  if (why.includes("source")) bits.push("the ILO source changes");
  if (why.includes("flag")) bits.push("ILO flags a series break (OBS_STATUS B)");
  if (why.includes("jump") && point.prevWage != null && point.wage != null) {
    bits.push(`mean monthly earnings move from ${fmtWage(point.prevWage)} to ${fmtWage(point.wage)}`);
  } else if (why.includes("jump")) {
    bits.push("USD earnings move more than 30% from the previous year");
  }
  const detail = bits.length
    ? bits.length === 1
      ? bits[0]
      : `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}`
    : "the wage series changes";
  return `Wage series break in ${point.year}: ${detail}. The line is not joined to the previous year.`;
}

export function wageYearLabel(year: number | null): string {
  if (year == null) return "No wage in this view";
  if (year === 2023) return "2023 wage and price";
  return `${year} wage, 2023 price`;
}
