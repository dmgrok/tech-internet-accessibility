#!/usr/bin/env python3
"""Build the internet-access page JSON from the trimmed country file.

Writes:
  src/data/accessData.json    imported by the page
  public/internet-gap.json    derived file offered with the page

The long country file is not an input. Unicorn counts are not an input.
"""

from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "internet" / "page_countries.csv"
MODEL = ROOT / "data" / "internet" / "gap_model.json"
WORLD = ROOT / "src" / "data" / "world.json"
APP_OUT = ROOT / "src" / "data" / "accessData.json"
PUBLIC_OUT = ROOT / "public" / "internet-gap.json"

VALUE_FIELDS = (
    "internet_users_pct",
    "gdp_pc_ppp_const2021",
    "internet_gap_vs_gdp_pp",
    "fixed_bb_pct_median_income",
)

# Story checks. These are the published rounded figures, not new estimates.
EXPECT = {
    "KGZ": {"use": 92.0, "pred": 59.3, "gap": 32.7},
    "JOR": {"use": 95.6, "pred": 69.2, "gap": 26.5},
    "MAR": {"use": 91.2, "pred": 65.8, "gap": 25.4},
    "PNG": {"use": 18.8, "pred": 44.4, "gap": -25.6},
    "UGA": {"use": 8.9, "pred": 33.5, "gap": -24.6},
    "AGO": {"use": 40.7, "pred": 64.6, "gap": -23.9},
    "NGA": {"use": 41.2, "pred": 62.1, "gap": -20.9, "bb": 44.4},
    "USA": {"use": 94.7, "gap": -1.0, "bb": 2.06},
    "IND": {"use": 64.9, "gap": -1.5},
    "DEU": {"use": 93.5, "gap": -1.2, "bb": 1.99},
    "CHN": {"use": 92.0, "gap": 6.7},
    "JPN": {"use": 85.5, "gap": -7.3},
}


def fail(message: str) -> None:
    sys.exit(message)


def fnum(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip()
    if text == "" or text.lower() == "nan":
        return None
    return float(text)


def rnum(value: float | None, digits: int) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def iyear(value: str | None) -> int | None:
    number = fnum(value)
    if number is None:
        return None
    return int(number)


def flag(value: str | None) -> str:
    return (value or "").strip()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    if not SRC.exists():
        fail(f"missing {SRC}")
    model = json.loads(MODEL.read_text(encoding="utf-8"))
    a = float(model["a"])
    b = float(model["b"])
    n = int(model["n"])
    r2 = float(model["r2"])
    world = json.loads(WORLD.read_text(encoding="utf-8"))
    map_ids = {feature["properties"]["iso3"] for feature in world["features"]}
    rows = read_csv(SRC)
    if len(rows) != 217:
        fail(f"expected 217 economies, found {len(rows)}")

    raw_text = SRC.read_text(encoding="utf-8")
    for banned in ("ookla", "unicorn", "\u2013", "\u2014"):
        if banned in raw_text.lower() if banned.isalpha() else banned in raw_text:
            fail(f"country file contains {banned!r}")

    def predict(gdp: float) -> float:
        return 100.0 / (1.0 + math.exp(-(a + b * math.log10(gdp))))

    countries = []
    worst = 0.0
    for row in rows:
        iso = row["iso3"].strip()
        name = row["country"].strip()
        use = fnum(row["internet_users_pct"])
        gdp = fnum(row["gdp_pc_ppp_const2021"])
        pred = fnum(row["internet_users_predicted_from_gdp_pct"])
        gap = fnum(row["internet_gap_vs_gdp_pp"])
        bb = fnum(row["fixed_bb_pct_median_income"])
        pop = fnum(row["population"])
        pop1m = row["pop_ge_1m"].strip() == "True"
        if pop is not None and pop1m != (pop >= 1_000_000):
            fail(f"population flag mismatch for {iso}")
        if gap is not None:
            if use is None or gdp is None or pred is None:
                fail(f"{iso} has a gap without use, GDP, or prediction")
            calc = predict(gdp)
            worst = max(worst, abs(calc - pred), abs((use - pred) - gap))
            if row["internet_users_pct__itu_estimate"].strip() != row["internet_gap_vs_gdp_pp__itu_estimate"].strip():
                fail(f"{iso} gap estimate flag does not match internet use")
            if iyear(row["internet_users_pct__year"]) != 2024 or iyear(row["gdp_pc_ppp_const2021__year"]) != 2024:
                fail(f"{iso} is in the fit but a year is not 2024")
        countries.append(
            {
                "id": iso,
                "name": name,
                "onMap": iso in map_ids,
                "pop": int(pop) if pop is not None else None,
                "pop1m": pop1m,
                "use": rnum(use, 6),
                "useYear": iyear(row["internet_users_pct__year"]),
                "useFlag": flag(row["internet_users_pct__itu_estimate"]),
                "gdp": rnum(gdp, 3),
                "gdpYear": iyear(row["gdp_pc_ppp_const2021__year"]),
                "gdpFlag": flag(row["gdp_pc_ppp_const2021__itu_estimate"]),
                "pred": rnum(pred, 6),
                "predYear": iyear(row["internet_users_predicted_from_gdp_pct__year"]),
                "gap": rnum(gap, 6),
                "gapYear": iyear(row["internet_gap_vs_gdp_pp__year"]),
                "gapFlag": flag(row["internet_gap_vs_gdp_pp__itu_estimate"]),
                "bb": rnum(bb, 6),
                "bbYear": iyear(row["fixed_bb_pct_median_income__year"]),
                "bbFlag": flag(row["fixed_bb_pct_median_income__itu_estimate"]),
            }
        )

    if worst > 1e-4:
        fail(f"curve does not match the file (worst gap {worst})")

    by_id = {country["id"]: country for country in countries}
    for iso, expect in EXPECT.items():
        country = by_id[iso]
        for key, target in expect.items():
            got = country[key]
            if got is None or abs(got - target) > 0.051:
                fail(f"{iso} {key} is {got}, expected about {target}")
    if not (by_id["DEU"]["bb"] < 2 < by_id["USA"]["bb"]):
        fail("Germany should be at or below 2% and the United States above it")

    fit = [country for country in countries if country["gap"] is not None]
    if len(fit) != n:
        fail(f"fit has {len(fit)} countries, model n is {n}")
    status = {"no": 0, "yes": 0, "likely": 0, "unknown": 0}
    for country in fit:
        status[country["useFlag"]] = status.get(country["useFlag"], 0) + 1
    if status != {"no": 70, "yes": 63, "likely": 14, "unknown": 30}:
        fail(f"unexpected estimate flags {status}")
    at_least_95 = sum(1 for country in fit if country["use"] is not None and country["use"] >= 95)
    with_bb = [country for country in countries if country["bb"] is not None]
    at_or_below = sum(1 for country in with_bb if country["bb"] <= 2)
    if at_least_95 != 24 or len(with_bb) != 191 or at_or_below != 22:
        fail(f"coverage mismatch 95%={at_least_95} broadband={len(with_bb)} at or below 2%={at_or_below}")

    def has_figure(country: dict) -> bool:
        return any(country[key] is not None for key in ("use", "gdp", "gap", "bb"))

    no_figures = [{"id": country["id"], "name": country["name"], "onMap": country["onMap"]} for country in countries if not has_figure(country)]
    unmapped = [{"id": country["id"], "name": country["name"]} for country in countries if not country["onMap"]]
    countries.sort(key=lambda country: country["name"])
    no_figures.sort(key=lambda country: country["name"])
    unmapped.sort(key=lambda country: country["name"])

    payload = {
        "model": {"a": a, "b": b, "n": n, "r2": r2},
        "targetPct": 2,
        "counts": {
            "economies": len(countries),
            "scatter": len(fit),
            "withBroadband": len(with_bb),
            "atOrBelowTarget": at_or_below,
            "atLeast95": at_least_95,
            "official": status["no"],
            "ituEstimate": status["yes"],
            "likely": status["likely"],
            "notStated": status["unknown"],
        },
        "noFigures": no_figures,
        "unmapped": unmapped,
        "countries": countries,
    }
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if "\u2013" in text or "\u2014" in text:
        fail("app json contains an en or em dash")
    lowered = text.lower()
    if "unicorn" in lowered or "ookla" in lowered:
        fail("app json contains a series this page does not ship")
    APP_OUT.write_text(text, encoding="utf-8")

    public_rows = []
    for country in countries:
        public_rows.append(
            {
                "iso3": country["id"],
                "country": country["name"],
                "on_map": country["onMap"],
                "population": country["pop"],
                "internet_use_pct": country["use"],
                "internet_use_year": country["useYear"],
                "internet_use_itu_estimate": country["useFlag"] or None,
                "gdp_pc_ppp_const2021": country["gdp"],
                "gdp_year": country["gdpYear"],
                "gdp_itu_estimate": country["gdpFlag"] or None,
                "predicted_internet_use_pct": country["pred"],
                "predicted_year": country["predYear"],
                "gap_percentage_points": country["gap"],
                "gap_year": country["gapYear"],
                "gap_itu_estimate": country["gapFlag"] or None,
                "fixed_bb_pct_median_income": country["bb"],
                "fixed_bb_year": country["bbYear"],
                "fixed_bb_itu_estimate": country["bbFlag"] or None,
            }
        )
    public = {
        "title": "Internet use, the income curve, and the gap",
        "author": "David Graça",
        "attribution": "David Graça, from ITU and World Bank data",
        "licence": "CC BY-NC-SA 3.0 IGO",
        "noncommercial": True,
        "preliminary": True,
        "model": {
            "a": a,
            "b": b,
            "n": n,
            "r2": r2,
            "formula": "predicted percent = 100 / (1 + exp(-(a + b * log10(gdp per capita PPP))))",
        },
        "broadband_target_pct_of_median_income": 2,
        "notes": [
            "Preliminary figures. The numbers are under review until the open checks are closed (incomplete ITU estimate flags, among others).",
            "This page is non-commercial and has no advertising.",
            "Predicted internet use and the gap are derived from ITU internet use and World Bank GDP per capita, PPP.",
            "This file is offered under CC BY-NC-SA 3.0 IGO, the licence of the ITU figures used in the curve.",
            "World Bank World Development Indicators and Poverty and Inequality Platform values are CC BY 4.0.",
            "ITU estimate flags: yes means ITU marks the value as an estimate; likely means the latest official figure is older than 2024; no means ITU does not mark it as an estimate; unknown means the World Bank copy does not state a flag; not_marked means a collected ITU price; n/a means not an ITU figure.",
            "A blank year means older than 2024, exact year not stated.",
            "The UN Broadband Commission 2% target is defined on GNI per capita. The broadband comparison on the page applies that threshold to the share of median income.",
        ],
        "countries": public_rows,
    }
    public_text = json.dumps(public, ensure_ascii=False, indent=2) + "\n"
    if "\u2013" in public_text or "\u2014" in public_text:
        fail("derived file contains an en or em dash")
    if "unicorn" in public_text.lower() or "ookla" in public_text.lower():
        fail("derived file contains a series this page does not ship")
    PUBLIC_OUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUT.write_text(public_text, encoding="utf-8")
    print(f"accessData.json bytes={APP_OUT.stat().st_size} countries={len(countries)} fit={len(fit)}")
    print(f"internet-gap.json bytes={PUBLIC_OUT.stat().st_size}")
    print("no figure", [item["id"] for item in no_figures])
    print("unmapped", [item["id"] for item in unmapped])


if __name__ == "__main__":
    main()
