import { useEffect, useMemo, useRef, useState } from "react";
import { init, type ECharts } from "echarts";
import { CountryPicker } from "./CountryPicker";
import { SourceBlock } from "./SourceBlock";
import { byId, data, HIGHLIGHT_LIMIT } from "../data";
import {
  ACCENT,
  axisNum,
  breakSentence,
  fmtGb,
  fmtUsd,
  fmtWage,
  GREY_LINE,
  INK,
  italySentence,
  lastPoint,
  oecdSentence,
} from "../format";
import type { Country, Metric, Point } from "../types";

const FONT = 'Inter, "Segoe UI", "Liberation Sans", sans-serif';
const DASH: (number[] | undefined)[] = [undefined, [9, 5], [3, 3], [10, 4, 2, 4], [6, 3], [2, 2], [12, 3], [4, 2, 1, 2]];

type Tip = { id: string; year: number; x: number; y: number };

function lineData(country: Country, metric: Metric): [number, number | null][] {
  const out: [number, number | null][] = [];
  let prevYear: number | null = null;
  for (const point of country.points) {
    const value = metric === "gb" ? point.gb : point.price;
    if (value == null) {
      prevYear = null;
      continue;
    }
    const broken = metric === "gb" && point.brk;
    if (prevYear != null && (point.year !== prevYear + 1 || broken)) {
      out.push([(prevYear + point.year) / 2, null]);
    }
    out.push([point.year, value]);
    prevYear = point.year;
  }
  return out;
}

function pointAt(country: Country, year: number): Point | undefined {
  return country.points.find((point) => point.year === year);
}

export function TrendChart({
  metric,
  highlight,
  onMetric,
  onHighlight,
}: {
  metric: Metric;
  highlight: string[];
  onMetric: (metric: Metric) => void;
  onHighlight: (ids: string[]) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const indexRef = useRef<Map<string, number>>(new Map());
  const [tip, setTip] = useState<Tip | null>(null);
  const tipRef = useRef<Tip | null>(null);

  const plotted = useMemo(() => {
    const passes = (country: Country) => (metric === "gb" ? country.gbSeries : country.priceSeries);
    const grey = data.countries.filter((country) => passes(country) && !highlight.includes(country.id));
    const chosen = highlight.map((id) => byId.get(id)).filter((country): country is Country => !!country && passes(country));
    return { grey, chosen, all: [...grey, ...chosen] };
  }, [metric, highlight]);

  const option = useMemo(() => {
    const values: number[] = [];
    for (const country of plotted.all) {
      for (const point of country.points) {
        const value = metric === "gb" ? point.gb : point.price;
        if (value != null && value > 0) values.push(value);
      }
    }
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const series = plotted.all.map((country) => {
      const on = highlight.includes(country.id);
      const order = highlight.indexOf(country.id);
      return {
        type: "line" as const,
        name: country.id,
        data: lineData(country, metric),
        showSymbol: true,
        symbol: "circle",
        symbolSize: on ? 7 : 3,
        connectNulls: false,
        triggerLineEvent: true,
        z: on ? 4 : 1,
        lineStyle: {
          width: on ? 2.6 : 1.05,
          color: on ? ACCENT : GREY_LINE,
          type: on ? DASH[order] ?? "solid" : "solid",
        },
        itemStyle: { color: on ? ACCENT : GREY_LINE },
        emphasis: {
          focus: "series" as const,
          lineStyle: { width: 2.8, color: INK },
          itemStyle: { color: INK },
        },
        blur: { lineStyle: { opacity: 0.15 } },
        silent: false,
      };
    });
    indexRef.current = new Map(plotted.all.map((country, index) => [country.id, index]));
    if (metric === "gb") {
      const breaks = plotted.chosen.flatMap((country) =>
        country.points
          .filter((point) => point.brk && point.gb != null)
          .map((point) => ({
            value: [point.year, point.gb] as [number, number],
            itemStyle: { color: "#fffcf7", borderColor: ACCENT, borderWidth: 2 },
          })),
      );
      series.push({
        type: "scatter" as const,
        name: "breaks",
        data: breaks as unknown as [number, number | null][],
        symbol: "emptyCircle",
        symbolSize: 12,
        z: 6,
        silent: true,
        tooltip: { show: false },
        itemStyle: { color: "#fffcf7", borderColor: ACCENT, borderWidth: 2 },
      } as unknown as (typeof series)[number]);
    }
    return {
      animation: false,
      grid: { left: 58, right: 18, top: 16, bottom: 36 },
      tooltip: { show: false },
      xAxis: {
        type: "value",
        min: 2018.7,
        max: 2023.35,
        axisLabel: {
          show: true,
          hideOverlap: false,
          color: "#5c564e",
          fontFamily: FONT,
          fontSize: 13,
          margin: 10,
          customValues: data.years,
          formatter: (value: number) => String(Math.round(value)),
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#e3dcd0" } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "log",
        min: 10 ** (Math.log10(lo) - 0.12),
        max: 10 ** (Math.log10(hi) + 0.12),
        name: metric === "gb" ? "GB per hour" : "USD per GB",
        nameTextStyle: { color: "#5c564e", fontFamily: FONT, padding: [0, 0, 0, 8] },
        axisLabel: {
          color: "#5c564e",
          fontFamily: FONT,
          formatter: (value: number) => (metric === "price" && value >= 1 ? `$${axisNum(value)}` : axisNum(value)),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        minorTick: { show: false },
        minorSplitLine: { show: false },
        splitLine: { lineStyle: { color: "#efeae2" } },
      },
      series,
    };
  }, [plotted, metric, highlight]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = init(host, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    const findHit = (x: number, y: number) => {
      let best: { id: string; year: number; dist: number } | null = null;
      for (const country of plottedRef.current) {
        for (const point of country.points) {
          const value = metricRef.current === "gb" ? point.gb : point.price;
          if (value == null) continue;
          const pixel = chart.convertToPixel({ gridIndex: 0 }, [point.year, value]);
          if (!pixel) continue;
          const dist = Math.hypot(pixel[0] - x, pixel[1] - y);
          if (dist < 18 && (!best || dist < best.dist)) best = { id: country.id, year: point.year, dist };
        }
      }
      return best;
    };
    const onMove = (event: { offsetX: number; offsetY: number }) => {
      const hit = findHit(event.offsetX, event.offsetY);
      const chartNow = chartRef.current;
      if (!chartNow) return;
      if (!hit) {
        if (tipRef.current) {
          tipRef.current = null;
          setTip(null);
        }
        chartNow.dispatchAction({ type: "downplay" });
        return;
      }
      const next = { id: hit.id, year: hit.year, x: event.offsetX, y: event.offsetY };
      const prev = tipRef.current;
      const moved = !prev || prev.id !== next.id || prev.year !== next.year || Math.abs(prev.x - next.x) > 10 || Math.abs(prev.y - next.y) > 10;
      if (moved) {
        tipRef.current = next;
        setTip(next);
      }
      if (!prev || prev.id !== next.id) {
        chartNow.dispatchAction({ type: "downplay" });
        const seriesIndex = indexRef.current.get(next.id);
        if (seriesIndex != null) chartNow.dispatchAction({ type: "highlight", seriesIndex });
      }
    };
    const onLeave = () => {
      tipRef.current = null;
      setTip(null);
      chartRef.current?.dispatchAction({ type: "downplay" });
    };
    const onClick = (event: { offsetX: number; offsetY: number }) => {
      const hit = findHit(event.offsetX, event.offsetY);
      if (!hit) return;
      const current = highlightRef.current;
      if (current.includes(hit.id) || current.length >= HIGHLIGHT_LIMIT) return;
      onHighlightRef.current([...current, hit.id]);
    };
    chart.getZr().on("mousemove", onMove);
    chart.getZr().on("globalout", onLeave);
    chart.getZr().on("click", onClick);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // The chart instance is created once. Data updates go through setOption.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plottedRef = useRef(plotted.all);
  const metricRef = useRef(metric);
  const highlightRef = useRef(highlight);
  const onHighlightRef = useRef(onHighlight);
  plottedRef.current = plotted.all;
  metricRef.current = metric;
  highlightRef.current = highlight;
  onHighlightRef.current = onHighlight;

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
    tipRef.current = null;
    setTip(null);
  }, [option]);

  const germany = byId.get("DEU");
  const germanyLast = germany ? lastPoint(germany, "gb") : null;
  const showGermanyNote = metric === "gb" && highlight.includes("DEU") && germanyLast?.gb != null && germanyLast.year !== 2023;
  const italyOn = highlight.includes("ITA");
  const drawn = metric === "gb" ? data.coverage.gbSeriesCountries : data.coverage.priceSeriesCountries;

  const tipCountry = tip ? byId.get(tip.id) : undefined;
  const tipPoint = tipCountry && tip ? pointAt(tipCountry, tip.year) : undefined;
  const tipValue = tipPoint ? (metric === "gb" ? tipPoint.gb : tipPoint.price) : null;

  return (
    <section className="block" id="trend">
      <p className="section-kicker">02  Trend</p>
      <h2>From 2019 to 2023</h2>
      <p className="section-intro">
        {drawn} countries are drawn. A country appears here only with a value in at least {data.minYears} of the {data.years.length} years.
        Every year in this chart covers at least {data.minCountries} countries. Select a grey line, or search, to highlight another country.
        Up to {HIGHLIGHT_LIMIT} highlights.
      </p>
      <div className="card">
        <div className="seg" role="tablist" aria-label="Chart measure">
          <button type="button" role="tab" aria-selected={metric === "gb"} onClick={() => onMetric("gb")}>
            GB per hour
          </button>
          <button type="button" role="tab" aria-selected={metric === "price"} onClick={() => onMetric("price")}>
            USD per GB
          </button>
        </div>
        <CountryPicker highlight={highlight} metric={metric} onChange={onHighlight} />
        <div className="key" aria-label="Highlighted countries">
          {highlight.map((id, index) => {
            const country = byId.get(id);
            if (!country) return null;
            const passes = metric === "gb" ? country.gbSeries : country.priceSeries;
            const point = passes ? lastPoint(country, metric) : null;
            const value = point ? (metric === "gb" ? point.gb : point.price) : null;
            return (
              <span className="key-item" key={id}>
                <i className={`swatch ${index === 1 ? "d1" : index === 2 ? "d2" : index > 2 ? "d1" : ""}`} />
                <strong>{country.name}</strong>
                {country.italy ? <span className="badge">Overstated</span> : null}
                <span>
                  {value == null || !point
                    ? "Not enough years"
                    : `${metric === "gb" ? fmtGb(value) : fmtUsd(value)}${point.year !== 2023 ? ` in ${point.year}` : ""}`}
                </span>
              </span>
            );
          })}
          <span className="key-item">
            <i className="swatch grey" />
            <span>Other countries</span>
          </span>
        </div>
        <div className="chart-wrap">
          <div
            ref={hostRef}
            className="chart"
            role="img"
            aria-label={
              metric === "gb"
                ? "Line chart of GB of mobile data one hour of average pay buys, 2019 to 2023. France, Germany and the United States are highlighted. Wage breaks are gaps."
                : "Line chart of the median USD price of 1 GB, 2019 to 2023. France, Germany and the United States are highlighted."
            }
          />
          {tip && tipCountry && tipPoint && tipValue != null ? (
            <div className="tip" style={{ left: Math.min(tip.x + 14, 640), top: Math.max(8, tip.y - 16) }}>
              <strong>{tipCountry.name}</strong>
              <div>{tip.year}</div>
              <div>{metric === "gb" ? fmtGb(tipValue) : `${fmtUsd(tipValue)} per GB`}</div>
              {tipPoint.price != null && metric === "gb" ? <div className="muted">{fmtUsd(tipPoint.price)} per GB</div> : null}
              {tipPoint.wage != null ? <div className="muted">Wage {fmtWage(tipPoint.wage)}</div> : null}
              {tipPoint.source ? <div className="muted">Wage source: {tipPoint.source}</div> : null}
              {metric === "gb" && tipPoint.brk ? <p className="caveat">{breakSentence(tipPoint)}</p> : null}
              {tipCountry.id === "FRA" ? <p className="caveat">{oecdSentence(data.headline.france, data.headline.france.wageYear)} France&apos;s labour force survey records net pay. The OECD figure is gross pay for a full-time equivalent.</p> : null}
              {tipCountry.id === "PRT" ? <p className="caveat">{oecdSentence(data.headline.portugal, data.headline.portugal.wageYear)} OECD wages are gross pay per full-time equivalent. ILO wages cover all employees.</p> : null}
              {tipCountry.italy ? <p className="caveat">{italySentence(data.italy.wage2020, data.italy.wage2021)}</p> : null}
            </div>
          ) : null}
        </div>
        {showGermanyNote && germanyLast?.gb != null ? (
          <p className="callout">
            Germany&apos;s line ends in {germanyLast.year} at {fmtGb(germanyLast.gb)}, the same-year price and wage. There is no 2023 ILO wage, so the line stops. The {fmtGb(data.headline.germany.gb)} in the headline uses the {data.headline.germany.wageYear} wage with the 2023 price of {fmtUsd(data.headline.germany.price)}.
          </p>
        ) : null}
        {italyOn ? (
          <p className="callout">
            <span className="badge">Overstated</span> {italySentence(data.italy.wage2020, data.italy.wage2021)}
          </p>
        ) : null}
        {metric === "gb" ? (
          <SourceBlock
            source="Source: Cable.co.uk, Worldwide mobile data pricing, 2023 edition, Historical Data tab, and ILOSTAT mean monthly earnings of employees in USD for the same year."
            definition={`Definition: GB per hour of pay = (mean monthly earnings / ${data.hours} hours) / the median USD price of 1 GB. ${data.hours} hours is a standard full-time month. A hollow marker is a break in the wage series, and the line is not joined across that break. The scale is logarithmic.`}
          />
        ) : (
          <SourceBlock
            source="Source: Cable.co.uk, Worldwide mobile data pricing, 2023 edition, Historical Data tab. One median per country for each edition from 2019 to 2023."
            definition="Definition: median USD price of 1 GB across the SIM-only consumer plans sampled in that country for that edition. Each edition has its own plan sample, country sample and exchange rates. The scale is logarithmic."
          />
        )}
      </div>
    </section>
  );
}
