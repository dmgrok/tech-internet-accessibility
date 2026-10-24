import { useEffect, useMemo, useRef } from "react";
import { init, type ECharts } from "echarts";
import { LABEL_IDS, access, accessById, curvePoints } from "./data";
import { CURVE, INK, scatterColor, symbolSize, tooltipHtml } from "./format";

const FONT = 'Inter, "Segoe UI", "Liberation Sans", sans-serif';
const TICKS = [1000, 3000, 10000, 30000, 100000];

type Props = {
  costMode: boolean;
  selectedId: string | null;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

function axisDollars(value: number): string {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function ScatterChart({ costMode, selectedId, activeId, onHover, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const hoverRef = useRef(onHover);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    hoverRef.current = onHover;
    selectRef.current = onSelect;
  }, [onHover, onSelect]);

  const option = useMemo(() => {
    const plotted = access.countries.filter((country) => country.gap != null && country.gdp != null && country.use != null);
    const maxPop = plotted.reduce((max, country) => Math.max(max, country.pop ?? 0), 1);
    const data = plotted.map((country) => {
      const on = country.id === selectedId;
      return {
        name: country.id,
        value: [country.gdp as number, country.use as number, country.pop ?? 0],
        itemStyle: {
          color: scatterColor(country, costMode),
          opacity: 0.85,
          borderColor: on ? INK : "rgba(28, 25, 22, 0.28)",
          borderWidth: on ? 2 : 0.6,
        },
        label: {
          show: LABEL_IDS.has(country.id) || on,
          formatter: () => country.name,
          position: "top" as const,
          color: INK,
          fontSize: 11,
          fontFamily: FONT,
          textBorderColor: "#fffcf7",
          textBorderWidth: 3,
        },
      };
    });
    return {
      animation: false,
      grid: { left: 58, right: 18, top: 36, bottom: 58 },
      tooltip: {
        trigger: "item" as const,
        confine: true,
        backgroundColor: "#fffcf7",
        borderColor: "#e3dcd0",
        textStyle: { color: INK, fontFamily: FONT, fontSize: 13 },
        extraCssText: "max-width:280px;white-space:normal;line-height:1.35;",
        formatter: (raw: { seriesName?: string; name?: string }) => {
          if (raw.seriesName !== "countries") return "";
          const country = raw.name ? accessById.get(raw.name) : undefined;
          return country ? tooltipHtml(country) : "";
        },
      },
      xAxis: {
        type: "log" as const,
        min: 1000,
        max: 150000,
        name: "GDP per person, PPP (constant 2021 international $)",
        nameLocation: "middle" as const,
        nameGap: 36,
        nameTextStyle: { color: "#5c564e", fontFamily: FONT, fontSize: 12 },
        axisLabel: {
          color: "#5c564e",
          fontFamily: FONT,
          customValues: TICKS,
          formatter: (value: number) => axisDollars(value),
        },
        axisLine: { lineStyle: { color: "#e3dcd0" } },
        splitLine: { lineStyle: { color: "#efeae2" } },
        minorSplitLine: { show: false },
      },
      yAxis: {
        type: "value" as const,
        min: 0,
        max: 100,
        name: "Internet users (% of population)",
        nameLocation: "middle" as const,
        nameGap: 40,
        nameTextStyle: { color: "#5c564e", fontFamily: FONT, fontSize: 12 },
        axisLabel: { color: "#5c564e", fontFamily: FONT },
        axisLine: { lineStyle: { color: "#e3dcd0" } },
        splitLine: { lineStyle: { color: "#efeae2" } },
      },
      series: [
        {
          name: "curve",
          type: "line" as const,
          silent: true,
          symbol: "none",
          data: curvePoints(access.model.a, access.model.b),
          z: 1,
          lineStyle: { color: CURVE, width: 1.5, type: "dashed" as const },
          tooltip: { show: false },
        },
        {
          name: "countries",
          type: "scatter" as const,
          data,
          z: 2,
          symbolSize: (value: number[]) => symbolSize(value[2], maxPop),
          labelLayout: { hideOverlap: true },
          emphasis: {
            focus: "self" as const,
            scale: 1.15,
            itemStyle: { borderColor: INK, borderWidth: 2 },
            label: {
              show: true,
              formatter: (params: { name?: string }) => (params.name ? accessById.get(params.name)?.name ?? "" : ""),
              color: INK,
              fontSize: 12,
              fontFamily: FONT,
              textBorderColor: "#fffcf7",
              textBorderWidth: 3,
            },
          },
        },
      ],
    };
  }, [costMode, selectedId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = init(host, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    chart.on("mouseover", (params) => {
      if (params.seriesName === "countries" && params.name) hoverRef.current(String(params.name));
    });
    chart.on("click", (params) => {
      if (params.seriesName === "countries" && params.name) selectRef.current(String(params.name));
    });
    chart.on("globalout", () => hoverRef.current(null));
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, { notMerge: true });
    chart.dispatchAction({ type: "downplay", seriesName: "countries" });
    if (activeId) chart.dispatchAction({ type: "highlight", seriesName: "countries", name: activeId });
  }, [option, activeId]);

  const label = costMode
    ? "Scatter plot of internet users against GDP per person. Points are coloured by home broadband cost against the 2% target. A dashed curve shows the share income predicts. The table lower on the page lists every figure."
    : "Scatter plot of internet users against GDP per person. Purple points are at least 10 percentage points more online than income predicts. Orange points are at least 10 percentage points less online. A dashed curve shows the share income predicts. The table lower on the page lists every figure.";

  return <div className="chart" role="img" tabIndex={0} aria-label={label} ref={hostRef} />;
}
