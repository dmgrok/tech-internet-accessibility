export function LandingPage() {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="wrap">
      <a className="skip" href="#content">Skip to content</a>
      <header id="content">
        <p className="kicker">Public figures</p>
        <h1 className="wide">Income, internet use, and the price of data</h1>
        <p className="byline">By David Graça</p>
        <p className="lead">
          Two short pages. One compares mobile data with an hour of pay. The other compares internet use with income, and the price of a basic home connection.
        </p>
      </header>
      <div className="link-grid">
        <a className="stat link-card" href={`${base}hour-of-pay/`}>
          <p className="stat-name">Mobile data</p>
          <p className="card-title">What an hour of pay buys in mobile data</p>
          <p className="stat-meta">France, Germany and the United States, 2019 to 2023.</p>
        </a>
        <a className="stat link-card" href={`${base}internet-access/`}>
          <p className="stat-name">Internet access</p>
          <p className="card-title">Money predicts who's online. Some countries defy it.</p>
          <p className="stat-meta">Internet use against GDP per person, and the gap. Preliminary figures.</p>
        </a>
      </div>
      <p className="def-line">Non-commercial. No advertising.</p>
    </div>
  );
}
