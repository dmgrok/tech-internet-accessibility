import { useEffect, useId, useRef, useState } from "react";
import { byId, data, HIGHLIGHT_LIMIT } from "../data";
import type { Metric } from "../types";

type Props = {
  highlight: string[];
  metric: Metric;
  onChange: (ids: string[]) => void;
};

export function CountryPicker({ highlight, metric, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const eligible = data.countries.filter((country) => (metric === "gb" ? country.gbSeries : country.priceSeries));
  const q = query.trim().toLowerCase();
  const matches = q
    ? eligible
        .filter((country) => !highlight.includes(country.id) && country.name.toLowerCase().includes(q))
        .sort((a, b) => {
          const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return as - bs || a.name.localeCompare(b.name);
        })
    : [];
  const shown = matches.slice(0, 8);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (id: string) => {
    if (highlight.includes(id) || highlight.length >= HIGHLIGHT_LIMIT) return;
    onChange([...highlight, id]);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="toolbar">
      <div className="search" ref={wrapRef}>
        <input
          aria-label="Add a country to the highlight"
          aria-expanded={open && shown.length > 0}
          aria-controls={listId}
          placeholder={highlight.length >= HIGHLIGHT_LIMIT ? "Remove a country to add another" : "Add a country, for example Portugal"}
          value={query}
          disabled={highlight.length >= HIGHLIGHT_LIMIT}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, Math.max(shown.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && shown[active]) {
              event.preventDefault();
              add(shown[active].id);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open && q && (
          <ul className="menu" id={listId} role="listbox">
            {shown.length === 0 ? (
              <li className="empty">No country with enough years matches.</li>
            ) : (
              shown.map((country, index) => (
                <li key={country.id}>
                  <button type="button" role="option" aria-selected={index === active} onMouseEnter={() => setActive(index)} onClick={() => add(country.id)}>
                    <span>{country.name}</span>
                    {country.italy ? <span className="badge">Overstated</span> : null}
                  </button>
                </li>
              ))
            )}
            {matches.length > shown.length ? <li className="empty">Keep typing to narrow {matches.length} matches.</li> : null}
          </ul>
        )}
      </div>
      <button type="button" className="ghost" onClick={() => onChange(["FRA", "DEU", "USA"])}>
        Reset to France, Germany, US
      </button>
      <div className="chips">
        {highlight.map((id) => {
          const country = byId.get(id);
          if (!country) return null;
          return (
            <span className="chip" key={id}>
              {country.name}
              {country.italy ? <span className="badge">Overstated</span> : null}
              <button type="button" aria-label={`Remove ${country.name}`} onClick={() => onChange(highlight.filter((item) => item !== id))}>
                ×
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
