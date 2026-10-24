export type AccessCountry = {
  id: string;
  name: string;
  onMap: boolean;
  pop: number | null;
  pop1m: boolean;
  use: number | null;
  useYear: number | null;
  useFlag: string;
  gdp: number | null;
  gdpYear: number | null;
  gdpFlag: string;
  pred: number | null;
  predYear: number | null;
  gap: number | null;
  gapYear: number | null;
  gapFlag: string;
  bb: number | null;
  bbYear: number | null;
  bbFlag: string;
};

export type Named = { id: string; name: string; onMap?: boolean };

export type AccessData = {
  model: { a: number; b: number; n: number; r2: number };
  targetPct: number;
  counts: {
    economies: number;
    scatter: number;
    withBroadband: number;
    atOrBelowTarget: number;
    atLeast95: number;
    official: number;
    ituEstimate: number;
    likely: number;
    notStated: number;
  };
  noFigures: Named[];
  unmapped: Named[];
  countries: AccessCountry[];
};
