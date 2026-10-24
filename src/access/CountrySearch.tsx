import { useEffect, useId, useRef, useState } from "react";
import { access } from "./data";
import type { AccessCountry } from "./types";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
};

export function CountrySearch({ query, onQuery, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const q = query.trim().toLowerCase();
  const matches = q
    ? access.countries
        .filter((country) => country.name.toLowerCase().includes(q))
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

  const choose = (country: AccessCountry) => {
    onSelect(country.id);
    onQuery(country.name);
    setOpen(false);
  };

  return (
    <div className="search" ref={wrapRef}>
      <input
        role="combobox"
        aria-label="Search by country name"
        aria-expanded={open && q.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${shown[active].id}` : undefined}
        placeholder="Search by country name"
        value={query}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          onQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, Math.max(shown.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && shown[active]) {
            event.preventDefault();
            choose(shown[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && q && (
        <ul className="menu" id={listId} role="listbox">
          {shown.length === 0 ? (
            <li className="empty">No matching country.</li>
          ) : (
            shown.map((country, index) => (
              <li key={country.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${country.id}`}
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(country)}
                >
                  <span>{country.name}</span>
                </button>
              </li>
            ))
          )}
          {matches.length > shown.length ? <li className="empty">{shown.length} of {matches.length} matches. Keep typing.</li> : null}
        </ul>
      )}
    </div>
  );
}
