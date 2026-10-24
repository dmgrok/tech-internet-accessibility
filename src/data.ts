import appData from "./data/appData.json";
import world from "./data/world.json";
import type { AppData, Country, WorldGeo } from "./types";

export const data = appData as AppData;
export const worldGeo = world as WorldGeo;
export const byId = new Map<string, Country>(data.countries.map((country) => [country.id, country]));

export const DEFAULT_HIGHLIGHT = ["FRA", "DEU", "USA"];
export const HIGHLIGHT_LIMIT = 8;
