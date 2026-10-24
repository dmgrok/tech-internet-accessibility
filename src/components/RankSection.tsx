import { useEffect, useMemo, useRef, useState } from "react";
import { init, registerMap, type ECharts } from "echarts";
import { SourceBlock } from "./SourceBlock";
import { data, worldGeo } from "../data";
import {
  binColor,
  BINS,
  EMPTY_LAND,
  fmtGb,
  fmtUsd,
  fmtWage,
  INK,
  italySentence,
  oecdSentence,
} from "../format";
import type { Country, RankYear } from "../types";

const FONT = 'Inter, "Segoe UI", "Liberation Sans", sans-serif';
const YEARS: RankYear[] = ["latest", "2023", "2022", "2021", "2020", "2019"];

let mapReady = false;
function ensureMap() {
  if (mapReady) return;
  registerMap("world", worldGeo as never);
  mapReady = true;
}

function project(point: number[]): number[] {
  const lng = point[0];
  const lat = Math.max(-56, Math.min(72, point[1]));
  return [(lng * Math.PI) / 180, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
}

function unproject(point: number[]): number[] {
  return [(point[0] * 180) / Math.PI, ((2 * Math.atan(Math.exp(point[1])) - Math.PI / 2) * 180) / Math.PI];
}

type Row = {
  country: Country;
  gb: number | null;
  price: number | null;
  wageYear: number | null;
  wage: number | null;
  source: string;
  rank: number | null;
};

function viewOf(country: Country, year: RankYear): Omit<Row, "rank" | "country"> {
  if (year === "latest") {
    return {
      gb: country.latest.gb,
      price: country.latest.price,
      wageYear: country.latest.wageYear,
      wage: country.latest.wage,
      source: country.latest.source,
    };
  }
  const point = country.points.find((item) => item.year === Number(year));
  return {
    gb: point?.gb ?? null,
    price: point?.price ?? null,
    wageYear: point?.wage != null ? Number(year) : null,
    wage: point?.wage ?? null,
    source: point?.source ?? "",
  };
}

function ranksFor(rows: { id: string; gb: number | null }[]): Map<string, number> {
  const sorted = rows.filter((row) => row.gb != null).sort((a, b) => (b.gb as number) - (a.gb as number));
  const map = new Map<string, number>();
  let last = Number.NaN;
  let rank = 0;
  sorted.forEach((row, index) => {
    if (row.gb !== last) {
      rank = index + 1;
      last = row.gb as number;
    }
    map.set(row.id, rank);
  });
  return map;
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type SortKey = "rank" | "name" | "gb" | "price" | "wageYear";

export function RankSection() {
  const [year, setYear] = useState<RankYear>("latest");
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "gb", dir: "desc" });
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<(id: string | null) => void>(() => {});
  const selectRef = useRef<(id: string) => void>(() => {});
  hoverRef.current = setHover;
  selectRef.current = (id: string) => setSelected((current) => (current === id ? null : id));

  const rows = useMemo(() => {
    const base = data.countries
      .map((country) => ({ country, ...viewOf(country, year) }))
      .filter((row) => row.gb != null || row.price != null);
    const rankMap = ranksFor(base.map((row) => ({ id: row.country.id, gb: row.gb })));
    const withRank: Row[] = base.map((row) => ({ ...row, rank: rankMap.get(row.country.id) ?? null }));
    const q = query.trim().toLowerCase();
    const filtered = q ? withRank.filter((row) => row.country.name.toLowerCase().includes(q)) : withRank;
    const dir = sort.dir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (sort.key === "name") return a.country.name.localeCompare(b.country.name) * dir;
      const av = sort.key === "rank" ? a.rank : sort.key === "wageYear" ? a.wageYear : a[sort.key];
      const bv = sort.key === "rank" ? b.rank : sort.key === "wageYear" ? b.wageYear : b[sort.key];
      if (av == null && bv == null) return a.country.name.localeCompare(b.country.name);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av === bv) return a.country.name.localeCompare(b.country.name);
      return (av - bv) * dir;
    });
    return { all: withRank, shown: filtered, withGb: withRank.filter((row) => row.gb != null).length };
  }, [year, query, sort]);

  const rowById = useMemo(() => new Map(rows.all.map((row) => [row.country.id, row])), [rows.all]);

  const option = useMemo(() => {
    const regions = data.countries
      .filter((country) => country.onMap)
      .map((country) => {
        const view = viewOf(country, year);
        const color = view.gb == null ? EMPTY_LAND : binColor(view.gb);
        const on = country.id === selected;
        return {
          name: country.id,
          value: view.gb,
          itemStyle: {
            areaColor: color,
            borderColor: on ? INK : "#ffffff",
            borderWidth: on ? 1.4 : 0.4,
          },
          emphasis: {
            itemStyle: { areaColor: color, borderColor: INK, borderWidth: 1.3 },
            label: { show: false },
          },
        };
      });
    return {
      animation: false,
      tooltip: {
        trigger: "item" as const,
        backgroundColor: "#fffcf7",
        borderColor: "#e3dcd0",
        textStyle: { color: INK, fontFamily: FONT, fontSize: 13 },
        formatter: (params: { name?: string }) => {
          const row = params.name ? rowById.get(params.name) : undefined;
          if (!row) return "No price and wage row for this area.";
          const bits = [`<strong>${esc(row.country.name)}</strong>`];
          bits.push(row.gb == null ? "No wage for this year" : `${fmtGb(row.gb)}${row.rank ? `, rank ${row.rank} of ${rows.withGb}` : ""}`);
          if (row.price != null) bits.push(`${fmtUsd(row.price)} per GB`);
          if (row.wage != null && row.wageYear != null) bits.push(`Wage ${fmtWage(row.wage)} in ${row.wageYear}`);
          if (row.country.italy) bits.push(esc(italySentence(data.italy.wage2020, data.italy.wage2021)));
          if (row.country.id === "FRA") bits.push(esc(`${oecdSentence(data.headline.france, data.headline.france.wageYear)} France's labour force survey records net pay.`));
          if (row.country.id === "PRT") bits.push(esc(oecdSentence(data.headline.portugal, data.headline.portugal.wageYear)));
          if (!row.country.onMap) bits.push("Not drawn as its own polygon.");
          return bits.join("<br/>");
        },
      },
      series: [
        {
          type: "map",
          map: "world",
          nameProperty: "iso3",
          roam: false,
          selectedMode: false,
          projection: { project, unproject },
          aspectScale: 0.9,
          top: 8,
          bottom: 8,
          left: 8,
          right: 8,
          itemStyle: { areaColor: EMPTY_LAND, borderColor: "#ffffff", borderWidth: 0.4 },
          emphasis: { label: { show: false } },
          data: regions,
        },
      ],
    };
  }, [year, selected, rowById, rows.withGb]);

  useEffect(() => {
    ensureMap();
    const host = hostRef.current;
    if (!host) return;
    const chart = init(host, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    chart.on("mouseover", (params) => {
      if (params.name) hoverRef.current(String(params.name));
    });
    chart.on("mouseout", () => hoverRef.current(null));
    chart.on("click", (params) => {
      if (params.name) selectRef.current(String(params.name));
    });
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (hover) chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: hover });
  }, [hover, option]);

  useEffect(() => {
    if (!selected || !scrollRef.current) return;
    const row = document.getElementById(`row-${selected}`);
    const box = scrollRef.current;
    if (!row) return;
    const top = row.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 48) box.scrollTop = Math.max(0, top - 48);
  }, [selected]);

  const activeId = hover ?? selected;
  const active = activeId ? rowById.get(activeId) : undefined;
  const sortButton = (key: SortKey, label: string, numeric = false) => {
    const on = sort.key === key;
    const initial: Record<SortKey, "asc" | "desc"> = { name: "asc", rank: "asc", gb: "desc", price: "asc", wageYear: "desc" };
    return (
      <th className={numeric ? "num" : undefined} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" onClick={() => setSort({ key, dir: on ? (sort.dir === "asc" ? "desc" : "asc") : initial[key] })}>
          {label} {on ? (sort.dir === "desc" ? "▼" : "▲") : ""}
        </button>
      </th>
    );
  };

  return (
    <section className="block" id="ranking">
      <p className="section-kicker">03  Ranking and map</p>
      <h2>Every country in the file</h2>
      <p className="section-intro">
        Rank 1 buys the most GB per hour of pay. The map uses the same figure. Hover or select a country to mark it in both places.
        {year === "latest"
          ? ` Latest pairs the 2023 Cable price with the ILO wage closest to 2023. ${data.coverage.latestGb} countries have a GB figure.`
          : ` ${year} uses the price and the wage from that year. ${data.coverage.gbByYear[year]} countries have a GB figure.`}
      </p>
      <div className="year-row rank-head" role="group" aria-label="Year">
        {YEARS.map((item) => (
          <button key={item} type="button" aria-pressed={year === item} onClick={() => setYear(item)}>
            {item === "latest" ? "Latest" : item}
          </button>
        ))}
      </div>
      <div className="filters">
        <input aria-label="Search the ranking" placeholder="Search countries" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="readout note">
        {active ? (
          <>
            <p>
              <strong>{active.country.name}</strong>
              {active.country.italy ? <> <span className="badge">Overstated</span></> : null}
              {active.gb != null ? ` ${fmtGb(active.gb)}` : " No wage for this year"}
              {active.rank != null ? `, rank ${active.rank} of ${rows.withGb}` : ""}
              {active.price != null ? `, ${fmtUsd(active.price)} per GB` : ""}
              {active.wageYear != null && active.wage != null ? `, wage ${fmtWage(active.wage)} in ${active.wageYear}` : ""}
              {!active.country.onMap ? " This place is not drawn as its own polygon." : ""}
            </p>
            {active.country.italy ? <p>{italySentence(data.italy.wage2020, data.italy.wage2021)}</p> : null}
            {active.country.id === "FRA" ? <p>{oecdSentence(data.headline.france, data.headline.france.wageYear)} France&apos;s labour force survey records net pay. The OECD figure is gross pay for a full-time equivalent.</p> : null}
            {active.country.id === "PRT" ? <p>{oecdSentence(data.headline.portugal, data.headline.portugal.wageYear)} OECD wages are gross pay per full-time equivalent. ILO wages cover all employees.</p> : null}
          </>
        ) : (
          <p>Hover a country on the map or in the table.</p>
        )}
      </div>
      <div className="rank-grid">
        <div className="card map-card">
          <div ref={hostRef} className="map" role="img" aria-label="World map coloured by GB of mobile data one hour of average pay buys. Blank countries have no wage match." />
          <div className="legend">
            {BINS.map((bin) => (
              <span key={bin.label}>
                <i style={{ background: bin.color }} />
                {bin.label}
              </span>
            ))}
            <span>
              <i style={{ background: EMPTY_LAND }} />
              No wage
            </span>
          </div>
        </div>
        <div className="card table-card">
          <div className="table-scroll" ref={scrollRef} onMouseLeave={() => setHover(null)}>
            <table>
              <thead>
                <tr>
                  {sortButton("rank", "GB rank", true)}
                  {sortButton("name", "Country")}
                  {sortButton("gb", "GB per hour", true)}
                  {sortButton("price", "USD per GB", true)}
                  {sortButton("wageYear", "Wage year", true)}
                </tr>
              </thead>
              <tbody>
                {rows.shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">No country matches that search.</td>
                  </tr>
                ) : (
                  rows.shown.map((row) => {
                    const on = row.country.id === selected || row.country.id === hover;
                    return (
                      <tr
                        key={row.country.id}
                        id={`row-${row.country.id}`}
                        className={`${on ? "active" : ""} ${row.country.italy ? "italy" : ""}`}
                        onMouseEnter={() => setHover(row.country.id)}
                        onClick={() => selectRef.current(row.country.id)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectRef.current(row.country.id);
                          }
                        }}
                      >
                        <td className="num">{row.rank ?? ""}</td>
                        <td>
                          <span className="country-name">{row.country.name}</span>
                          {row.country.italy ? <span className="row-note">Overstated: gross pay from 2021</span> : null}
                          {row.country.id === "FRA" ? <span className="row-quiet">ILO wage {data.headline.france.oecdPct != null ? `${Math.abs(data.headline.france.oecdPct).toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : ""} below OECD, {data.headline.france.wageYear}</span> : null}
                          {row.country.id === "PRT" ? <span className="row-quiet">ILO wage {data.headline.portugal.oecdPct != null ? `${Math.abs(data.headline.portugal.oecdPct).toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : ""} below OECD, {data.headline.portugal.wageYear}</span> : null}
                        </td>
                        <td className="num">{row.gb != null ? fmtGb(row.gb, false) : "No wage"}</td>
                        <td className="num">{row.price != null ? fmtUsd(row.price) : ""}</td>
                        <td className="num">{row.wageYear ?? ""}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="def-line">
            Showing {rows.shown.length} of {rows.all.length} countries with a price or a wage in this view. {rows.withGb} have a GB figure.
          </p>
        </div>
      </div>
      <SourceBlock
        source={
          year === "latest"
            ? "Source: Cable.co.uk 2023 median USD per GB, ILOSTAT mean monthly earnings in USD for the year closest to 2023, and Natural Earth 1:50m admin-0 countries for the map."
            : `Source: Cable.co.uk median USD per GB for ${year}, ILOSTAT mean monthly earnings in USD for ${year}, and Natural Earth 1:50m admin-0 countries for the map.`
        }
        definition={`Definition: GB per hour of pay = (mean monthly earnings / ${data.hours} hours) / USD price of 1 GB. Rank 1 buys the most. Colour bins are fixed ranges of that figure. Blank land has no wage match for the selected year.`}
      />
    </section>
  );
}
