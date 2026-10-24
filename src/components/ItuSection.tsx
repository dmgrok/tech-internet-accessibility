import { useEffect, useMemo, useRef } from "react";
import { init, type ECharts } from "echarts";
import { CountryPicker } from "./CountryPicker";
import { SourceBlock } from "./SourceBlock";
import { byId, data } from "../data";
import { ACCENT, axisNum, fmtShare, italySentence } from "../format";
import type { Country, Metric } from "../types";

const FONT = 'Inter, "Segoe UI", "Liberation Sans", sans-serif';

function successionData(iso: string): [number, number | null][] {
  const series = data.itu.byIso[iso];
  if (!series) return [];
  const baskets = data.itu.baskets.filter((basket) => basket.role === "succession");
  const out: [number, number | null][] = [];
  let prevYear: number | null = null;
  baskets.forEach((basket, index) => {
    if (index > 0 && prevYear != null) out.push([(prevYear + basket.years[0]) / 2, null]);
    let started = false;
    for (const year of basket.years) {
      const value = series[basket.id]?.[String(year)];
      if (value == null) {
        if (started) prevYear = null;
        continue;
      }
      if (prevYear != null && year !== prevYear + 1) out.push([(prevYear + year) / 2, null]);
      out.push([year, value]);
      prevYear = year;
      started = true;
    }
  });
  return out;
}

function overlayData(iso: string): [number, number][] {
  const basket = data.itu.baskets.find((item) => item.role === "overlay");
  if (!basket) return [];
  const series = data.itu.byIso[iso]?.[basket.id] ?? {};
  return basket.years.flatMap((year) => {
    const value = series[String(year)];
    return value == null ? [] : [[year, value] as [number, number]];
  });
}

function ItuChart({ country }: { country: Country }) {
  const ref = useRef<HTMLDivElement>(null);
  const option = useMemo(() => {
    const yMin = 10 ** (Math.log10(data.itu.min) - 0.15);
    const yMax = 10 ** (Math.log10(data.itu.max) + 0.2);
    return {
      animation: false,
      grid: { left: 48, right: 10, top: 28, bottom: 28 },
      tooltip: {
        trigger: "item" as const,
        backgroundColor: "#fffcf7",
        borderColor: "#e3dcd0",
        textStyle: { color: "#1c1916", fontFamily: FONT, fontSize: 12 },
        formatter: (params: { value?: [number, number] | number[]; seriesName?: string }) => {
          const value = params.value;
          if (!value || value.length < 2) return "";
          return `${country.name}<br/>${value[0]}: ${fmtShare(Number(value[1]))}<br/>${params.seriesName ?? ""}`;
        },
      },
      xAxis: {
        type: "value",
        min: 2012.6,
        max: 2025.4,
        axisLabel: {
          color: "#5c564e",
          fontFamily: FONT,
          fontSize: 11,
          formatter: (value: number) => ([2013, 2017, 2021, 2025].includes(Math.round(value)) ? String(Math.round(value)) : ""),
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: "#e3dcd0" } },
      },
      yAxis: {
        type: "log",
        min: yMin,
        max: yMax,
        axisLabel: { color: "#5c564e", fontFamily: FONT, fontSize: 11, formatter: (value: number) => `${axisNum(value)}%` },
        axisLine: { show: false },
        axisTick: { show: false },
        minorTick: { show: false },
        minorSplitLine: { show: false },
        splitLine: { lineStyle: { color: "#efeae2" } },
      },
      series: [
        {
          type: "line",
          name: "Basket in use that year",
          data: successionData(country.id),
          connectNulls: false,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { color: ACCENT, width: 2.2 },
          itemStyle: { color: ACCENT },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#cfc6b8", width: 1 },
            label: { show: true, color: "#5c564e", fontSize: 10, fontFamily: FONT, position: "insideEndTop" },
            data: data.itu.gaps.map((gap) => ({ xAxis: gap.at, name: gap.label, label: { formatter: gap.label } })),
          },
        },
        {
          type: "line",
          name: "5 GB basket, not joined",
          data: overlayData(country.id),
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { color: ACCENT, width: 2.2, type: "dashed" },
          itemStyle: { color: ACCENT },
        },
      ],
    };
  }, [country]);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const chart: ECharts = init(host, undefined, { renderer: "canvas" });
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return (
    <article className="card itu-card">
      <h3>
        {country.name}
        {country.italy ? <span className="badge">Overstated</span> : null}
      </h3>
      {country.italy ? <p className="row-note">{italySentence(data.italy.wage2020, data.italy.wage2021)} This chart uses GNI per capita, not that wage.</p> : null}
      <div ref={ref} className="itu-chart" role="img" aria-label={`ITU mobile basket price as a percent of GNI per capita for ${country.name}. The line breaks when the basket definition changes.`} />
    </article>
  );
}

export function ItuSection({
  highlight,
  metric,
  onHighlight,
}: {
  highlight: string[];
  metric: Metric;
  onHighlight: (ids: string[]) => void;
}) {
  const chosen = highlight.map((id) => byId.get(id)).filter((country): country is Country => !!country);
  const withSeries = chosen.filter((country) => data.itu.byIso[country.id]);
  const missing = chosen.filter((country) => !data.itu.byIso[country.id]);
  return (
    <section className="block" id="itu">
      <p className="section-kicker">04  Affordability</p>
      <h2>Share of income</h2>
      <p className="section-intro">
        ITU tracks the monthly price of a mobile data basket as a percent of GNI per capita. The basket definition changes, so the line is broken at each change and the new basket is labelled. The dashed line is the 5 GB basket, published beside the 2 GB basket from 2022. This file covers {data.coverage.ituEconomies} economies, under the {data.minCountries} country line for a world ranking, so it is only a trend for those economies.
      </p>
      <CountryPicker highlight={highlight} metric={metric} onChange={onHighlight} />
      <div className="key itu-legend">
        <span className="key-item">
          <i className="swatch" />
          <span>1 GB, then 1.5 GB, then 2 GB, with a gap at each new definition</span>
        </span>
        <span className="key-item">
          <i className="swatch d1" />
          <span>5 GB basket from 2022, not joined to the line above</span>
        </span>
      </div>
      {missing.length > 0 ? (
        <p className="callout">No ITU series in this file for {missing.map((country) => country.name).join(", ")}. The file covers France, Germany, Italy, Spain, the United Kingdom, Portugal, the United States, China and India.</p>
      ) : null}
      <div className="itu-grid">
        {withSeries.map((country) => (
          <ItuChart key={country.id} country={country} />
        ))}
      </div>
      {withSeries.length === 0 ? <p className="empty">None of the highlighted countries are in the ITU file.</p> : null}
      <SourceBlock
        source="Source: ITU ICT Price Baskets, 2008 to 2025, mobile-broadband basket as a percent of GNI per capita."
        definition="Definition: monthly price of the cheapest plan that meets the basket, divided by monthly GNI per capita. Baskets are 1 GB postpaid computer-based (2013 to 2017), 1.5 GB data-only (2018 to 2020), 2 GB data-only (2021 to 2025) and 5 GB data-only (2022 to 2025, the headline basket from 2025). Lines are not joined across a change of definition. The scale is logarithmic."
      />
    </section>
  );
}
