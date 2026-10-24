import { useEffect, useMemo, useRef } from "react";
import { init, registerMap, type ECharts } from "echarts";
import world from "../data/world.json";
import type { WorldGeo } from "../types";
import { access, accessById } from "./data";
import { ABOVE, INK, MEETS, MISSING, gapColor, tooltipHtml } from "./format";

const FONT = 'Inter, "Segoe UI", "Liberation Sans", sans-serif';
const worldGeo = world as WorldGeo;

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

const HATCH = {
  symbol: "rect",
  color: "rgba(28, 25, 22, 0.28)",
  dashArrayX: [1, 0],
  dashArrayY: [4, 3],
  rotation: Math.PI / 4,
};

type Props = {
  costMode: boolean;
  selectedId: string | null;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

export function GapMap({ costMode, selectedId, activeId, onHover, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const hoverRef = useRef(onHover);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    hoverRef.current = onHover;
    selectRef.current = onSelect;
  }, [onHover, onSelect]);

  const option = useMemo(() => {
    const regions = access.countries
      .filter((country) => country.onMap)
      .map((country) => {
        let color = MISSING;
        let hatch = true;
        if (costMode) {
          if (country.bb != null) {
            color = country.bb <= access.targetPct ? MEETS : ABOVE;
            hatch = false;
          }
        } else if (country.gap != null) {
          color = gapColor(country.gap);
          hatch = false;
        }
        const on = country.id === selectedId;
        return {
          name: country.id,
          value: costMode ? country.bb : country.gap,
          itemStyle: {
            areaColor: color,
            borderColor: on ? INK : "#ffffff",
            borderWidth: on ? 2.6 : 0.45,
            decal: hatch ? HATCH : { symbol: "none" },
          },
          emphasis: {
            itemStyle: { areaColor: color, borderColor: INK, borderWidth: 2.6, decal: hatch ? HATCH : { symbol: "none" } },
            label: { show: false },
          },
        };
      });
    return {
      animation: false,
      aria: { enabled: true, decal: { show: true } },
      tooltip: {
        trigger: "item" as const,
        confine: true,
        backgroundColor: "#fffcf7",
        borderColor: "#e3dcd0",
        textStyle: { color: INK, fontFamily: FONT, fontSize: 13 },
        extraCssText: "max-width:280px;white-space:normal;line-height:1.35;",
        formatter: (raw: { name?: string }) => {
          const country = raw.name ? accessById.get(raw.name) : undefined;
          if (!country) return "No row for this area.";
          return tooltipHtml(country);
        },
      },
      series: [
        {
          name: "gap",
          type: "map" as const,
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
          itemStyle: { areaColor: MISSING, borderColor: "#ffffff", borderWidth: 0.4, decal: HATCH },
          emphasis: { label: { show: false }, itemStyle: { areaColor: MISSING, borderColor: INK, borderWidth: 1.4 } },
          data: regions,
        },
      ],
    };
  }, [costMode, selectedId]);

  useEffect(() => {
    ensureMap();
    const host = hostRef.current;
    if (!host) return;
    const chart = init(host, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    chart.on("mouseover", (params) => {
      if (params.name && accessById.has(String(params.name))) hoverRef.current(String(params.name));
    });
    chart.on("click", (params) => {
      if (params.name && accessById.has(String(params.name))) selectRef.current(String(params.name));
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
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (activeId) chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: activeId });
  }, [option, activeId]);

  const label = costMode
    ? "World map coloured by the cheapest home broadband plan as a share of median monthly income. Blue is at or below the 2% target. Orange is above it. Hatched grey means no figure. The table lists the figures."
    : "World map of the gap between internet use and the share GDP per person predicts, in percentage points. Brown is less online than predicted. Purple is more online. Hatched grey means no 2024 figure. The table lists the figures.";

  return <div className="map" role="img" tabIndex={0} aria-label={label} ref={hostRef} />;
}
