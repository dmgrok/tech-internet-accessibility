#!/usr/bin/env python3
"""Build src/data/appData.json and src/data/world.json from the handoff files.

Coverage rule (also stated on the page):
  A year or measure is shown only when at least 30 countries have a value.
  A country is drawn on the time series only when it has a value in at least
  3 of the 5 years 2019 to 2023.

GB per hour is taken from the CSVs. It is not recomputed for display.
The check below only confirms the published formula still matches.
"""

from __future__ import annotations

import csv
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

try:
    import shapefile
except ImportError:
    sys.exit("pyshp is required: python3 -m pip install pyshp")

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "src" / "data"
YEARS = [2019, 2020, 2021, 2022, 2023]
MIN_COUNTRIES = 30
MIN_YEARS = 3
HOURS = 173.3

# Natural Earth 1:50m uses ADM0_A3. A few ISO_A3 codes are -99.
# Kosovo is KOS on the map and XKX in the wage and price files.
ISO_ALIAS = {"KOS": "XKX"}
DROP_ADM = {"ATA", "ATF"}
# Cable leaves ISO3 blank for several territories. Use the map code when the
# 1:50m file actually has that polygon.
ISO2_ON_MAP = {
    "MQ": "MTQ",
    "RE": "REU",
    "GF": "GUF",
    "GP": "GLP",
    "YT": "MYT",
    "BQ": "BES",
    "CC": "CCK",
    "SJ": "SJM",
    "TK": "TKL",
}

BASKET_ORDER = [
    ("i271md_pd_B1GB_GNI", "b1", "succession"),
    ("i271mb_1GB5_GNI", "b15", "succession"),
    ("i271mb_2GB_GNI", "b2", "succession"),
    ("i271mb_5GB_GNI", "b5", "overlay"),
]


def clean(text: str) -> str:
    return (
        text.replace("\u2013", ", ")
        .replace("\u2014", ", ")
        .replace("\u2212", "-")
        .replace("\u00a0", " ")
        .strip()
    )


def fnum(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip()
    if text == "" or text.lower() == "nan":
        return None
    return float(text)


def rnum(value: float | None, digits: int) -> float | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), digits)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def country_id(iso3: str, iso2: str, name: str) -> str:
    code = (iso3 or "").strip()
    if len(code) == 3 and code != "-99":
        return code
    short = (iso2 or "").strip()
    if short:
        return "X:" + short
    slug = "".join(ch if ch.isalnum() else "-" for ch in name.lower()).strip("-")
    return "N:" + slug


def point_line_distance(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = bx - ax, by - ay
    den = dx * dx + dy * dy
    if den == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / den
    t = 0 if t < 0 else 1 if t > 1 else t
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def rdp(points: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points[a]
        bx, by = points[b]
        dmax = -1.0
        imax = None
        for i in range(a + 1, b):
            dist = point_line_distance(points[i][0], points[i][1], ax, ay, bx, by)
            if dist > dmax:
                dmax = dist
                imax = i
        if imax is not None and dmax > eps:
            keep[imax] = True
            stack.append((a, imax))
            stack.append((imax, b))
    return [point for point, flag in zip(points, keep) if flag]


def ring_epsilon(ring: list[tuple[float, float]]) -> float:
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    diag = math.hypot(max(xs) - min(xs), max(ys) - min(ys))
    if diag < 0.35:
        return max(0.008, diag / 14)
    if diag < 1.5:
        return 0.035
    if diag < 6:
        return 0.07
    return 0.12


def quantize(ring: list[tuple[float, float]], digits: int) -> list[list[float]]:
    out: list[list[float]] = []
    for x, y in ring:
        point = [round(x, digits), round(y, digits)]
        if not out or out[-1] != point:
            out.append(point)
    if len(out) >= 2 and out[0] != out[-1]:
        out.append(out[0])
    return out


def simplify_ring(coords: list) -> list[list[float]] | None:
    ring = [(float(p[0]), float(p[1])) for p in coords]
    if len(ring) < 4:
        return None
    eps = ring_epsilon(ring)
    simplified = quantize(rdp(ring, eps), 2)
    if len(simplified) < 4:
        simplified = quantize(rdp(ring, max(eps / 5, 0.005)), 3)
    if len(simplified) < 4:
        simplified = quantize(ring, 3)
    if len(simplified) < 4:
        return None
    return simplified


def simplify_geometry(geom: dict) -> dict | None:
    kind = geom.get("type")
    if kind == "Polygon":
        polygons = [geom["coordinates"]]
        multi = False
    elif kind == "MultiPolygon":
        polygons = geom["coordinates"]
        multi = True
    else:
        return None
    kept = []
    for poly in polygons:
        if not poly:
            continue
        exterior = simplify_ring(poly[0])
        if not exterior:
            continue
        holes = []
        for hole in poly[1:]:
            simplified = simplify_ring(hole)
            if simplified:
                holes.append(simplified)
        kept.append([exterior, *holes])
    if not kept:
        return None
    if not multi and len(kept) == 1:
        return {"type": "Polygon", "coordinates": kept[0]}
    return {"type": "MultiPolygon", "coordinates": kept}


def build_world() -> set[str]:
    path = RAW / "ne_50m_admin_0_countries.shp"
    reader = shapefile.Reader(str(path))
    fields = [field[0] for field in reader.fields[1:]]
    index = {name: pos for pos, name in enumerate(fields)}
    features = []
    seen: dict[str, dict] = {}
    for rec, shape in zip(reader.records(), reader.shapes()):
        adm = str(rec[index["ADM0_A3"]] or "").strip()
        iso = str(rec[index["ISO_A3"]] or "").strip()
        if adm in DROP_ADM:
            continue
        if len(iso) == 3 and iso != "-99":
            iso3 = iso
        else:
            iso3 = ISO_ALIAS.get(adm, adm)
        if iso3 in ("", "-99"):
            continue
        geom = simplify_geometry(shape.__geo_interface__)
        if geom is None:
            continue
        if iso3 in seen:
            current = seen[iso3]["geometry"]
            parts = []
            for existing in (current, geom):
                if existing["type"] == "Polygon":
                    parts.append(existing["coordinates"])
                else:
                    parts.extend(existing["coordinates"])
            seen[iso3]["geometry"] = {"type": "MultiPolygon", "coordinates": parts}
            continue
        feature = {
            "type": "Feature",
            "properties": {"iso3": iso3, "name": iso3},
            "geometry": geom,
        }
        seen[iso3] = feature
        features.append(feature)
    collection = {"type": "FeatureCollection", "features": features}
    text = json.dumps(collection, separators=(",", ":"), ensure_ascii=False)
    if "\u2013" in text or "\u2014" in text:
        sys.exit("map geojson contains an en or em dash")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "world.json").write_text(text, encoding="utf-8")
    print(f"world.json  features={len(features)}  bytes={len(text.encode('utf-8'))}")
    return set(seen)


def break_why(row: dict, prev: dict | None) -> list[str]:
    why: list[str] = []
    if prev is not None:
        prev_src = (prev.get("SOURCE") or "").strip()
        src = (row.get("SOURCE") or "").strip()
        if prev_src and src != prev_src:
            why.append("source")
        prev_wage = fnum(prev.get("ilo_monthly_usd", ""))
        wage = fnum(row.get("ilo_monthly_usd", ""))
        if prev_wage not in (None, 0) and wage is not None and abs(wage / prev_wage - 1) > 0.30:
            why.append("jump")
    if (row.get("OBS_STATUS") or "").strip() == "B":
        why.append("flag")
    return why


def build_app(map_ids: set[str]) -> None:
    merged_rows = read_csv(RAW / "cost_per_gb_merged.csv")
    series_rows = read_csv(RAW / "timeseries_cable_ilo_2019_2023.csv")
    itu_rows = read_csv(RAW / "itu_mobile_affordability_series.csv")
    cross_rows = read_csv(RAW / "ilo_vs_oecd_crosscheck.csv")

    merged: dict[str, dict[str, str]] = {}
    for row in merged_rows:
        merged[row["country"]] = row

    by_country: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in series_rows:
        by_country[row["country"]].append(row)

    cross_pct = {row["iso3"]: fnum(row["ilo_vs_oecd_pct"]) for row in cross_rows}

    countries = []
    for name, rows in by_country.items():
        rows = sorted(rows, key=lambda item: int(item["year"]))
        meta = merged.get(name)
        iso3 = (meta or rows[-1]).get("iso3", "") or ""
        iso2 = (meta or rows[-1]).get("iso2", "") or ""
        cid = country_id(iso3, iso2, name)
        iso2_key = iso2.strip()
        mapped = ISO2_ON_MAP.get(iso2_key)
        if cid not in map_ids and mapped in map_ids:
            cid = mapped
        points = []
        prev = None
        for row in rows:
            year = int(row["year"])
            gb = fnum(row["gb_per_hour_of_pay"])
            price = fnum(row["cable_usd_per_gb"])
            wage = fnum(row["ilo_monthly_usd"])
            flagged = (row.get("wage_break") or "").strip().lower() == "true"
            why = break_why(row, prev) if flagged and gb is not None else []
            prev_wage = fnum(prev["ilo_monthly_usd"]) if prev and flagged and gb is not None else None
            if flagged and gb is not None and not why:
                why = ["flag"]
            points.append(
                {
                    "year": year,
                    "gb": rnum(gb, 6),
                    "price": rnum(price, 6),
                    "wage": rnum(wage, 3),
                    "brk": bool(flagged and gb is not None),
                    "why": why,
                    "prevWage": rnum(prev_wage, 3),
                    "source": clean(row.get("SOURCE") or "") if wage is not None else "",
                }
            )
            prev = row
        # Guarantee one slot per year so the client can walk 2019 to 2023.
        by_year = {point["year"]: point for point in points}
        points = []
        for year in YEARS:
            points.append(
                by_year.get(
                    year,
                    {
                        "year": year,
                        "gb": None,
                        "price": None,
                        "wage": None,
                        "brk": False,
                        "why": [],
                        "prevWage": None,
                        "source": "",
                    },
                )
            )
        gb_years = sum(point["gb"] is not None for point in points)
        price_years = sum(point["price"] is not None for point in points)
        latest_gb = fnum(meta["gb_per_hour_of_pay"]) if meta else None
        latest_price = fnum(meta["cable_usd_per_gb"]) if meta else None
        latest_wage = fnum(meta["ilo_mean_monthly_earnings_usd"]) if meta else None
        latest_year = fnum(meta["ilo_wage_year"]) if meta else None
        oecd = fnum(meta["ilo_vs_oecd_pct"]) if meta else None
        if oecd is None:
            oecd = cross_pct.get(cid)
        countries.append(
            {
                "id": cid,
                "name": clean(name),
                "iso2": iso2.strip(),
                "gbSeries": gb_years >= MIN_YEARS,
                "priceSeries": price_years >= MIN_YEARS,
                "oecdPct": rnum(oecd, 4),
                "italy": cid == "ITA",
                "onMap": cid in map_ids,
                "latest": {
                    "gb": rnum(latest_gb, 6),
                    "price": rnum(latest_price, 6),
                    "wageYear": int(latest_year) if latest_year is not None else None,
                    "wage": rnum(latest_wage, 3),
                    "source": clean(meta.get("ilo_source") or "") if meta and latest_wage is not None else "",
                },
                "points": points,
            }
        )

    countries.sort(key=lambda item: item["name"])

    def year_count(key: str, year: int) -> int:
        return sum(1 for country in countries for point in country["points"] if point["year"] == year and point[key] is not None)

    gb_by_year = {str(year): year_count("gb", year) for year in YEARS}
    price_by_year = {str(year): year_count("price", year) for year in YEARS}
    for year, count in {**gb_by_year, **price_by_year}.items():
        if count < MIN_COUNTRIES:
            sys.exit(f"year {year} has only {count} countries, under the coverage rule")

    latest_gb = sum(country["latest"]["gb"] is not None for country in countries)
    latest_price = sum(country["latest"]["price"] is not None for country in countries)
    if latest_gb < MIN_COUNTRIES or latest_price < MIN_COUNTRIES:
        sys.exit("latest snapshot is below the 30 country rule")

    def headline(iso: str) -> dict:
        country = next(item for item in countries if item["id"] == iso)
        meta = next(row for row in merged_rows if (row.get("iso3") or "") == iso)
        gb = fnum(meta["gb_per_hour_of_pay"])
        price = fnum(meta["cable_usd_per_gb"])
        wage = fnum(meta["ilo_mean_monthly_earnings_usd"])
        if gb is None or price is None or wage is None or price == 0:
            sys.exit(f"missing headline inputs for {iso}")
        recomputed = (wage / HOURS) / price
        if abs(recomputed - gb) > 0.02:
            sys.exit(f"formula mismatch for {iso}: file {gb} recomputed {recomputed}")
        return {
            "id": iso,
            "name": country["name"],
            "gb": rnum(gb, 6),
            "price": rnum(price, 6),
            "wage": rnum(wage, 3),
            "wageYear": int(float(meta["ilo_wage_year"])),
            "oecdPct": rnum(fnum(meta["ilo_vs_oecd_pct"]), 4),
            "rank": int(float(meta["rank_gb_per_hour"])),
        }

    france = headline("FRA")
    germany = headline("DEU")
    us = headline("USA")
    portugal = headline("PRT")
    if france["wageYear"] != 2023 or us["wageYear"] != 2023 or germany["wageYear"] != 2022:
        sys.exit("unexpected wage years on the headline countries")
    fra_cross = next(row for row in cross_rows if row["iso3"] == "FRA")
    prt_cross = next(row for row in cross_rows if row["iso3"] == "PRT")
    if abs(float(fra_cross["ilo_vs_oecd_pct"]) - france["oecdPct"]) > 0.001:
        sys.exit("France OECD gap does not match the cross-check file")
    if abs(float(prt_cross["ilo_vs_oecd_pct"]) - portugal["oecdPct"]) > 0.001:
        sys.exit("Portugal OECD gap does not match the cross-check file")

    italy_rows = {int(row["year"]): row for row in by_country["Italy"]}
    italy = {
        "wage2020": rnum(fnum(italy_rows[2020]["ilo_monthly_usd"]), 3),
        "wage2021": rnum(fnum(italy_rows[2021]["ilo_monthly_usd"]), 3),
    }

    basket_labels: dict[str, str] = {}
    basket_values: dict[str, dict[str, dict[str, float]]] = defaultdict(lambda: defaultdict(dict))
    for row in itu_rows:
        code = row["basket"]
        basket_labels[code] = clean(row["basket_label"])
        basket_values[row["iso3"]][code][str(int(row["year"]))] = rnum(fnum(row["pct_gni"]), 4)

    baskets = []
    itu_numbers: list[float] = []
    for code, bid, role in BASKET_ORDER:
        years = sorted(int(year) for year in {y for iso in basket_values.values() for y in iso.get(code, {})})
        baskets.append({"id": bid, "code": code, "label": basket_labels[code], "years": years, "role": role})
        for iso in basket_values.values():
            itu_numbers.extend(value for value in iso.get(code, {}).values() if value is not None)
    by_iso = {}
    for iso, baskets_for_iso in basket_values.items():
        by_iso[iso] = {}
        for code, bid, _role in BASKET_ORDER:
            if code in baskets_for_iso:
                by_iso[iso][bid] = baskets_for_iso[code]

    unmapped = sorted(country["name"] for country in countries if not country["onMap"] and (country["latest"]["price"] is not None or any(point["price"] is not None for point in country["points"])))

    payload = {
        "hours": HOURS,
        "minCountries": MIN_COUNTRIES,
        "minYears": MIN_YEARS,
        "years": YEARS,
        "coverage": {
            "gbByYear": gb_by_year,
            "priceByYear": price_by_year,
            "gbSeriesCountries": sum(country["gbSeries"] for country in countries),
            "priceSeriesCountries": sum(country["priceSeries"] for country in countries),
            "latestGb": latest_gb,
            "latestPrice": latest_price,
            "ituEconomies": len(by_iso),
            "unmapped": unmapped,
        },
        "headline": {"france": france, "germany": germany, "us": us, "portugal": portugal},
        "italy": italy,
        "countries": countries,
        "itu": {
            "min": min(itu_numbers),
            "max": max(itu_numbers),
            "baskets": baskets,
            "gaps": [
                {"at": 2017.5, "label": "1.5 GB basket"},
                {"at": 2020.5, "label": "2 GB basket"},
            ],
            "byIso": by_iso,
        },
    }

    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if "\u2013" in text or "\u2014" in text:
        sys.exit("app data contains an en or em dash")
    (OUT / "appData.json").write_text(text, encoding="utf-8")

    cov = payload["coverage"]
    print(f"appData.json  countries={len(countries)}  bytes={len(text.encode('utf-8'))}")
    print("headline FRA", france["gb"], "DEU", germany["gb"], "USA", us["gb"])
    print("oecd FRA", france["oecdPct"], "PRT", portugal["oecdPct"])
    print("gb by year", gb_by_year)
    print("price by year", price_by_year)
    print("gb series", cov["gbSeriesCountries"], "price series", cov["priceSeriesCountries"])
    print("latest gb", latest_gb, "latest price", latest_price, "itu", cov["ituEconomies"])
    print("unmapped", unmapped)
    missing_focus = [code for code in ("FRA", "DEU", "USA", "ITA", "PRT", "GBR", "NOR", "CHN", "IND", "XKX") if code not in map_ids]
    if missing_focus:
        sys.exit(f"map is missing {missing_focus}")


def main() -> None:
    map_ids = build_world()
    build_app(map_ids)


if __name__ == "__main__":
    main()
