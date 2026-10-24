import { useCallback, useMemo, useState } from "react";
import { About } from "./About";
import { CountrySearch } from "./CountrySearch";
import { DataTable } from "./DataTable";
import { GapMap } from "./GapMap";
import { ScatterChart } from "./ScatterChart";
import { access, accessById } from "./data";
import { ABOVE, GAP_BINS, LESS, MEETS, MORE, NEAR, factLines, fitSummary, fmtPct, ituLabel } from "./format";
import type { AccessCountry } from "./types";

function pointsLeader(countries: AccessCountry[]): AccessCountry | undefined {
  return countries
    .filter((country) => country.pop1m && country.gap != null && country.gap > 0)
    .sort((a, b) => (b.gap as number) - (a.gap as number))[0];
}

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

  const fit = fitSummary(access.model.r2);
  const leader = pointsLeader(access.countries);
  const selectedText = selectedCountry
    ? `${selectedCountry.name}. ${factLines(selectedCountry).map((fact) => `${fact.label}: ${fact.text}`).join(" ")}`
    : "";

  return (
    <div className="wrap access">
      <a className="skip" href="#content">Skip to content</a>
      <p className="banner" role="note">
        <strong>Preliminary.</strong> Figures stay under review until open checks close, including incomplete ITU estimate flags.
      </p>
      <nav className="nav" aria-label="Sections">
        <a href={base}>Home</a>
        <a href="#scatter">Scatter</a>
        <a href="#map">Map</a>
        <a href="#table">Table</a>
        <a href="#about">About</a>
      </nav>
      <header id="content">
        <p className="kicker">Internet use vs income</p>
        <h1 className="wide" id="scatter">Money predicts who's online. Some countries defy it.</h1>
        <p className="byline">By David Graça</p>
        <p className="lead">
          Income alone accounts for {fit.pct}% of the differences in internet use across {access.model.n} countries. So the real story is who beats their income and who falls short. Each dot is a country in 2024. The dashed curve shows what its income predicts.
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
          Colour by broadband cost
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
        Broadband cost is the cheapest home plan as a share of median monthly income. The UN Broadband Commission sets its 2% target on monthly GNI per capita. This view applies the same 2% line to median income. Hover, search or pick from the table to mark a country on both views.
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
          <p>Hover or pick a country to see its numbers here. It lights up on the scatter and the map too.</p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{selectedText}</p>

      <section className="chart-section" aria-labelledby="scatter">
        <div className="card">
          <ul className="key" aria-label={costMode ? "Broadband cost colours" : "Scatter colours"}>
            {costMode ? (
              <>
                <li className="key-item"><i className="dot" style={{ background: MEETS }} /> At or under the 2% target</li>
                <li className="key-item"><i className="dot" style={{ background: ABOVE }} /> Over the 2% target</li>
                <li className="key-item"><i className="dot" style={{ background: NEAR }} /> No broadband figure</li>
              </>
            ) : (
              <>
                <li className="key-item"><i className="dot" style={{ background: MORE }} /> 10+ points more online</li>
                <li className="key-item"><i className="dot" style={{ background: NEAR }} /> Within 10 points</li>
                <li className="key-item"><i className="dot" style={{ background: LESS }} /> 10+ points less online</li>
              </>
            )}
            <li className="key-item"><i className="swatch curve" /> What income predicts</li>
          </ul>
          <p className="def-line">Bigger dots mean more people. Gap: actual internet use minus what GDP per person predicts.</p>
          <ScatterChart costMode={costMode} selectedId={selected} activeId={active} onHover={onHover} onSelect={onSelect} />
          <footer className="source-block">
            <p>Sources: ITU via World Bank WDI (IT.NET.USER.ZS); World Bank WDI (NY.GDP.PCAP.PP.KD). Population: World Bank WDI (SP.POP.TOTL). Calculation: David Graça.</p>
            <p>ITU data: CC BY-NC-SA 3.0 IGO. Non-commercial, ad-free.</p>
          </footer>
        </div>
      </section>

      <section className="block" id="map">
        <p className="section-kicker">Map</p>
        <h2>{costMode ? "Where basic home broadband costs over 2% of median income" : "Who beats the income curve, and who falls short"}</h2>
        <p className="section-intro">
          {costMode
            ? `Cheapest home broadband plan as a share of median monthly income, 2025. Blue meets the 2% target. Orange misses it. Only ${access.counts.atOrBelowTarget} of ${access.counts.withBroadband} countries with a figure make it, almost all of them rich.`
            : `Internet users in 2024 against what GDP per person predicts, in percentage points. Purple: more online than predicted. Orange to brown: less.${
                leader
                  ? ` Among countries with 1 million people or more, the ${leader.name} leads at ${fmtPct(Math.abs(leader.gap as number))} points above (${ituLabel(leader.gapFlag)}).`
                  : ""
              }`}
        </p>
        <div className="card">
          <ul className="legend" aria-label={costMode ? "Broadband map colours" : "Gap legend"}>
            {costMode ? (
              <>
                <li><i style={{ background: MEETS }} /> 2% or less</li>
                <li><i style={{ background: ABOVE }} /> Over 2%</li>
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
                ? "Sources: ITU ICT Price Baskets 2025; World Bank Poverty and Inequality Platform, 2025 lineup, release 20260922. Calculation: David Graça."
                : "Sources: ITU via World Bank WDI; World Bank WDI. Calculation: David Graça."}
            </p>
            <p>ITU data: CC BY-NC-SA 3.0 IGO. Hatched grey: no figure for this view. Non-commercial, ad-free.</p>
          </footer>
        </div>
      </section>

      <section className="block" id="table">
        <p className="section-kicker">Table</p>
        <h2>All the numbers</h2>
        <p className="section-intro">
          Every figure behind the charts, ready for keyboard and screen reader users. Pick a country to mark it on the scatter and the map. No exact year? The cell says: older than 2024, exact year not stated.
        </p>
        <DataTable rows={rows} total={access.countries.length} activeId={active} selectedId={selected} onHover={onHover} onSelect={onSelect} />
      </section>

      <About />
      <p className="byline foot">By David Graça. Non-commercial and ad-free. ITU data: CC BY-NC-SA 3.0 IGO.</p>
    </div>
  );
}
