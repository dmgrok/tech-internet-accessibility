import { useCallback, useMemo, useState } from "react";
import { About } from "./About";
import { CountrySearch } from "./CountrySearch";
import { DataTable } from "./DataTable";
import { GapMap } from "./GapMap";
import { ScatterChart } from "./ScatterChart";
import { access, accessById } from "./data";
import { ABOVE, GAP_BINS, LESS, MEETS, MORE, NEAR, factLines } from "./format";

export default function AccessApp() {
  const base = import.meta.env.BASE_URL;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [costMode, setCostMode] = useState(false);
  const onHover = useCallback((id: string | null) => setHover(id), []);
  const onSelect = useCallback((id: string) => {
    setSelected((current) => (current === id ? null : id));
  }, []);
  const active = selected ?? hover;
  const activeCountry = active ? accessById.get(active) : undefined;
  const selectedCountry = selected ? accessById.get(selected) : undefined;
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!q) return access.countries;
    return access.countries.filter((country) => country.name.toLowerCase().includes(q));
  }, [q]);

  const selectedText = selectedCountry
    ? `${selectedCountry.name}. ${factLines(selectedCountry).map((fact) => `${fact.label}: ${fact.text}`).join(" ")}`
    : "";

  return (
    <div className="wrap access">
      <a className="skip" href="#content">Skip to content</a>
      <p className="banner" role="note">
        <strong>Preliminary figures.</strong> The numbers are under review until the open checks are closed (incomplete ITU estimate flags, among others).
      </p>
      <nav className="nav" aria-label="Sections">
        <a href={base}>Home</a>
        <a href="#scatter">Scatter</a>
        <a href="#map">Map</a>
        <a href="#table">Table</a>
        <a href="#about">About</a>
      </nav>
      <header id="content">
        <p className="kicker">Internet use and income</p>
        <h1 className="wide" id="scatter">Richer countries are more online, but not all of them</h1>
        <p className="byline">By David Graça</p>
        <p className="lead">
          Share of people using the internet against income per person, 2024. The dashed curve is the share a country's income predicts.
        </p>
      </header>

      <div className="toolbar">
        <CountrySearch query={query} onQuery={setQuery} onSelect={(id) => setSelected(id)} />
        <label className="switch">
          <input
            type="checkbox"
            checked={costMode}
            onChange={(event) => setCostMode(event.target.checked)}
            aria-describedby="cost-def"
          />
          Colour by home broadband cost
        </label>
        {(query || selected) && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setQuery("");
              setSelected(null);
              setHover(null);
            }}
          >
            Clear
          </button>
        )}
      </div>
      <p className="def-line" id="cost-def">
        The cheapest home broadband plan as a share of median monthly income. The UN Broadband Commission target is 2% of monthly GNI per capita. This colouring applies that 2% line to median income. Hover a country, or select one from the search or the table, and it is marked on both views.
      </p>

      <div className="readout card" aria-live="off">
        {activeCountry ? (
          <>
            <p className="country-name">{activeCountry.name}</p>
            <dl className="facts">
              {factLines(activeCountry).map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.text}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p>Hover or select a country to read its figures here. The same country is marked on the scatter and the map.</p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{selectedText}</p>

      <section className="chart-section" aria-labelledby="scatter">
        <div className="card">
          <ul className="key" aria-label={costMode ? "Broadband cost colours" : "Scatter colours"}>
            {costMode ? (
              <>
                <li className="key-item"><i className="dot" style={{ background: MEETS }} /> At or below the 2% target</li>
                <li className="key-item"><i className="dot" style={{ background: ABOVE }} /> Above the 2% target</li>
                <li className="key-item"><i className="dot" style={{ background: NEAR }} /> No broadband figure</li>
              </>
            ) : (
              <>
                <li className="key-item"><i className="dot" style={{ background: MORE }} /> 10 or more points above the curve</li>
                <li className="key-item"><i className="dot" style={{ background: NEAR }} /> Within 10 points</li>
                <li className="key-item"><i className="dot" style={{ background: LESS }} /> 10 or more points below the curve</li>
              </>
            )}
            <li className="key-item"><i className="swatch curve" /> Expected from income</li>
          </ul>
          <p className="def-line">Larger points are countries with more people. Gap is actual internet use minus the share predicted from GDP per person.</p>
          <ScatterChart costMode={costMode} selectedId={selected} activeId={active} onHover={onHover} onSelect={onSelect} />
          <footer className="source-block">
            <p>Source: ITU via World Bank WDI (IT.NET.USER.ZS), World Bank WDI (NY.GDP.PCAP.PP.KD). Population: World Bank WDI (SP.POP.TOTL). Calculation: David Graça.</p>
            <p>ITU data licensed CC BY-NC-SA 3.0 IGO. Non-commercial, no ads.</p>
          </footer>
        </div>
      </section>

      <section className="block" id="map">
        <p className="section-kicker">Map</p>
        <h2>{costMode ? "Where a basic home connection costs more than 2% of median income" : "Where countries are more, or less, online than their income predicts"}</h2>
        <p className="section-intro">
          {costMode
            ? "Cheapest home broadband plan as a share of median monthly income, 2025. Blue is at or below the 2% target. Orange is above it."
            : "Internet users in 2024 compared with what GDP per person predicts, in percentage points."}
        </p>
        <div className="card">
          <ul className="legend" aria-label={costMode ? "Broadband map colours" : "Gap legend"}>
            {costMode ? (
              <>
                <li><i style={{ background: MEETS }} /> At or below 2%</li>
                <li><i style={{ background: ABOVE }} /> Above 2%</li>
                <li><i className="hatch" /> No figure</li>
              </>
            ) : (
              <>
                {GAP_BINS.map((bin) => (
                  <li key={bin.label}><i style={{ background: bin.color }} /> {bin.label}</li>
                ))}
                <li><i className="hatch" /> No figure</li>
              </>
            )}
          </ul>
          <GapMap costMode={costMode} selectedId={selected} activeId={active} onHover={onHover} onSelect={onSelect} />
          <footer className="source-block">
            <p>
              {costMode
                ? "Source: ITU ICT Price Baskets 2025; World Bank Poverty and Inequality Platform, 2025 lineup, release 20260922. Calculation: David Graça."
                : "Source: ITU via World Bank WDI; World Bank WDI. Calculation: David Graça."}
            </p>
            <p>ITU data licensed CC BY-NC-SA 3.0 IGO. Hatched grey has no figure for this colouring. Non-commercial, no ads.</p>
          </footer>
        </div>
      </section>

      <section className="block" id="table">
        <p className="section-kicker">Table</p>
        <h2>Figures by country</h2>
        <p className="section-intro">
          The same figures as the charts, for keyboard and screen reader access. Choose a country to mark it on the scatter and the map. Where a year is blank, the cell says: older than 2024, exact year not stated.
        </p>
        <DataTable rows={rows} total={access.countries.length} activeId={active} selectedId={selected} onHover={onHover} onSelect={onSelect} />
      </section>

      <About />
      <p className="byline foot">By David Graça. Non-commercial. No advertising. ITU data licensed CC BY-NC-SA 3.0 IGO.</p>
    </div>
  );
}
