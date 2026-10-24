import { useEffect, useRef } from "react";
import { fmtBb, fmtGdp, fmtPct, fmtPoints, ituLabel, yearLabel } from "./format";
import type { AccessCountry } from "./types";

type Props = {
  rows: AccessCountry[];
  total: number;
  activeId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

function detail(year: number | null, flag: string): string {
  return `Year: ${yearLabel(year)}. ${ituLabel(flag)}.`;
}

export function DataTable({ rows, total, activeId, selectedId, onHover, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const row = document.getElementById(`country-${selectedId}`);
    const box = scrollRef.current;
    if (!row) return;
    const top = row.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 48) {
      box.scrollTop = Math.max(0, top - 48);
    }
  }, [selectedId]);

  return (
    <div className="table-scroll" ref={scrollRef}>
      <table>
        <caption>
          {rows.length === total ? `${total} economies.` : `${rows.length} of ${total} economies.`} Under each figure: its year and ITU estimate flag.
        </caption>
        <thead>
          <tr>
            <th scope="col">Country</th>
            <th scope="col">Internet use (% of people)</th>
            <th scope="col">GDP per person, PPP</th>
            <th scope="col">Income predicts (% of people)</th>
            <th scope="col">Gap (percentage points)</th>
            <th scope="col">Home broadband (% of median income)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>No country matches.</td>
            </tr>
          ) : null}
          {rows.map((country) => {
            const on = country.id === activeId;
            return (
              <tr key={country.id} id={`country-${country.id}`} className={country.id === selectedId ? "active" : on ? "hover" : undefined}>
                <th scope="row">
                  <button
                    type="button"
                    className="row-btn"
                    aria-pressed={country.id === selectedId}
                    onMouseEnter={() => onHover(country.id)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(country.id)}
                    onBlur={() => onHover(null)}
                    onClick={() => onSelect(country.id)}
                  >
                    {country.name}
                  </button>
                </th>
                <td>
                  {country.use == null ? <span className="row-quiet">No figure.</span> : <><span className="figure">{fmtPct(country.use)}%</span><span className="row-quiet">{detail(country.useYear, country.useFlag)}</span></>}
                </td>
                <td>
                  {country.gdp == null ? <span className="row-quiet">No figure.</span> : <><span className="figure">{fmtGdp(country.gdp)}</span><span className="row-quiet">{detail(country.gdpYear, country.gdpFlag)}</span></>}
                </td>
                <td>
                  {country.pred == null ? <span className="row-quiet">No figure.</span> : <><span className="figure">{fmtPct(country.pred)}%</span><span className="row-quiet">Year: {yearLabel(country.predYear)}. Calculated on this page.</span></>}
                </td>
                <td>
                  {country.gap == null ? <span className="row-quiet">No figure.</span> : <><span className="figure">{fmtPoints(country.gap)}</span><span className="row-quiet">{detail(country.gapYear, country.gapFlag)}</span></>}
                </td>
                <td>
                  {country.bb == null ? (
                    <span className="row-quiet">No figure.</span>
                  ) : (
                    <>
                      <span className="figure">{fmtBb(country.bb)}%</span>
                      <span className="row-quiet">
                        {detail(country.bbYear, country.bbFlag)} {country.bb <= 2 ? "At or under the 2% target." : "Over the 2% target."}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
