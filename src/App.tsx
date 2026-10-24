import { useState } from "react";
import { ItuSection } from "./components/ItuSection";
import { RankSection } from "./components/RankSection";
import { SourcesSection } from "./components/SourcesSection";
import { TrendChart } from "./components/TrendChart";
import { data, DEFAULT_HIGHLIGHT } from "./data";
import { fmtGb, oecdSentence, wageYearLabel } from "./format";
import type { Headline, Metric } from "./types";

function Stat({ item }: { item: Headline }) {
  return (
    <article className="stat">
      <p className="stat-name">{item.name}</p>
      <p className="stat-value">
        {fmtGb(item.gb, false)}
        <span>GB</span>
      </p>
      <p className="stat-meta">{wageYearLabel(item.wageYear)}</p>
      <p className="stat-rank">
        Rank {item.rank} of {data.coverage.latestGb}
      </p>
    </article>
  );
}

export default function App() {
  const [metric, setMetric] = useState<Metric>("gb");
  const [highlight, setHighlight] = useState<string[]>(DEFAULT_HIGHLIGHT);
  const { france, germany, us, portugal } = data.headline;
  return (
    <div className="wrap">
      <nav className="nav" aria-label="Sections">
        {import.meta.env.BASE_URL.startsWith("/") ? <a href={import.meta.env.BASE_URL}>Home</a> : null}
        <a href="#answer">Answer</a>
        <a href="#trend">Trend</a>
        <a href="#ranking">Ranking</a>
        <a href="#itu">Income share</a>
        <a href="#sources">Sources</a>
      </nav>
      <header id="answer">
        <p className="kicker">Mobile data and wages</p>
        <h1>What an hour of pay buys in mobile data</h1>
        <p className="byline">By David Graça</p>
        <p className="lead">
          At 2023 prices, one hour of average pay buys {fmtGb(france.gb)} of mobile data in France, {fmtGb(germany.gb)} in Germany and {fmtGb(us.gb)} in the United States.
        </p>
        <div className="stats">
          <Stat item={france} />
          <Stat item={germany} />
          <Stat item={us} />
        </div>
        <div className="note">
          <p>
            Germany has no 2023 ILO wage. {fmtGb(germany.gb)} uses the {germany.wageYear} wage with the 2023 price. France and the United States use 2023 wages and 2023 prices.
          </p>
          <p>
            {oecdSentence(france, france.wageYear)} {oecdSentence(portugal, portugal.wageYear)} OECD wages are gross pay per full-time equivalent. ILO wages cover all employees, and France&apos;s labour force survey records net pay.
          </p>
        </div>
        <p className="def-line">
          Definition: GB per hour of pay = (ILO mean monthly earnings / {data.hours} hours) / Cable median USD price of 1 GB. {data.hours} hours is a standard full-time month.
        </p>
      </header>
      <TrendChart metric={metric} highlight={highlight} onMetric={setMetric} onHighlight={setHighlight} />
      <RankSection />
      <ItuSection highlight={highlight} metric={metric} onHighlight={setHighlight} />
      <SourcesSection />
    </div>
  );
}
