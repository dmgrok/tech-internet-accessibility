import accessData from "../data/accessData.json";
import type { AccessCountry, AccessData } from "./types";

export const access = accessData as AccessData;
export const accessById = new Map<string, AccessCountry>(access.countries.map((country) => [country.id, country]));

const PINNED = ["USA", "CHN", "IND", "NGA", "DEU", "BRA"];

export function labelIds(countries: AccessCountry[]): Set<string> {
  const big = countries.filter((country) => country.pop1m && country.gap != null);
  const more = [...big].sort((a, b) => (b.gap as number) - (a.gap as number)).slice(0, 6);
  const less = [...big].sort((a, b) => (a.gap as number) - (b.gap as number)).slice(0, 6);
  const ids = new Set<string>([...more, ...less].map((country) => country.id));
  for (const id of PINNED) {
    if (accessById.has(id)) ids.add(id);
  }
  return ids;
}

export const LABEL_IDS = labelIds(access.countries);

export function curvePoints(a: number, b: number): [number, number][] {
  const min = Math.log10(1000);
  const max = Math.log10(150000);
  const points: [number, number][] = [];
  for (let i = 0; i <= 40; i += 1) {
    const log = min + ((max - min) * i) / 40;
    const gdp = 10 ** log;
    const pred = 100 / (1 + Math.exp(-(a + b * log)));
    points.push([gdp, pred]);
  }
  return points;
}
