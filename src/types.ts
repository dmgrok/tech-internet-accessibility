export type WhyCode = "source" | "flag" | "jump";

export type Point = {
  year: number;
  gb: number | null;
  price: number | null;
  wage: number | null;
  brk: boolean;
  why: WhyCode[];
  prevWage: number | null;
  source: string;
};

export type Latest = {
  gb: number | null;
  price: number | null;
  wageYear: number | null;
  wage: number | null;
  source: string;
};

export type Country = {
  id: string;
  name: string;
  iso2: string;
  gbSeries: boolean;
  priceSeries: boolean;
  oecdPct: number | null;
  italy: boolean;
  onMap: boolean;
  latest: Latest;
  points: Point[];
};

export type Headline = {
  id: string;
  name: string;
  gb: number;
  price: number;
  wage: number;
  wageYear: number;
  oecdPct: number | null;
  rank: number;
};

export type Basket = {
  id: string;
  code: string;
  label: string;
  years: number[];
  role: "succession" | "overlay";
};

export type AppData = {
  hours: number;
  minCountries: number;
  minYears: number;
  years: number[];
  coverage: {
    gbByYear: Record<string, number>;
    priceByYear: Record<string, number>;
    gbSeriesCountries: number;
    priceSeriesCountries: number;
    latestGb: number;
    latestPrice: number;
    ituEconomies: number;
    unmapped: string[];
  };
  headline: {
    france: Headline;
    germany: Headline;
    us: Headline;
    portugal: Headline;
  };
  italy: { wage2020: number; wage2021: number };
  countries: Country[];
  itu: {
    min: number;
    max: number;
    baskets: Basket[];
    gaps: { at: number; label: string }[];
    byIso: Record<string, Record<string, Record<string, number>>>;
  };
};

export type WorldGeo = {
  type: string;
  features: {
    type: string;
    properties: { iso3: string; name: string };
    geometry: unknown;
  }[];
};

export type Metric = "gb" | "price";
export type RankYear = "latest" | "2019" | "2020" | "2021" | "2022" | "2023";
