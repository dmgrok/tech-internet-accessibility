import { access } from "./data";
import { fitSummary } from "./format";

const base = import.meta.env.BASE_URL;

export function About() {
  const { counts, model, noFigures, unmapped } = access;
  const fit = fitSummary(model.r2);
  return (
    <section className="block" id="about">
      <p className="section-kicker">About</p>
      <h2>The fine print</h2>
      <div className="prose">
        <p>
          By David Graça. This page is non-commercial and ad-free. Reuse it the same way: non-commercial, no ads.
        </p>
        <p>
          The dashed curve is a logistic fit of internet use on the log of GDP per person, across {model.n} countries with 2024 figures. R² is {fit.r2}: income accounts for {fit.pct}% of the variation. Predicted use levels off below 100%. The gap is actual internet use minus that prediction, in percentage points. It is what one curve leaves over, not a policy score. It shows association, not cause.
        </p>
        <p>
          Of the {counts.scatter} internet use figures, {counts.official} are official and {counts.ituEstimate} are ITU estimates. Another {counts.likely} are likely ITU estimates, because the latest official figure is older than 2024. The World Bank copy states no estimate flag for {counts.notStated}. {counts.atLeast95} countries are at or above 95% online, so their gap cannot be large.
        </p>
        <p>
          Home broadband cost is the monthly price of the cheapest plan from the largest operator with at least 5 GB and 256 kbit/s, divided by the median person's monthly income or consumption. Only {counts.atOrBelowTarget} of {counts.withBroadband} countries with a figure come in at or under 2%. The UN Broadband Commission defines its target on GNI per capita, so applying it to median income is a reframing. The median is per person, but a household shares one connection, so the share overstates what a household pays. ITU price baskets are collected prices, and ITU does not mark them as estimates.
        </p>
        <h3>Reuse the data</h3>
        <p>
          You can reuse the predicted use and gap figures under CC BY-NC-SA 3.0 IGO, the same licence as the ITU figures behind them. Credit: David Graça, from ITU and World Bank data.{" "}
          <a href={`${base}internet-gap.json`}>Download the derived file (JSON)</a>.
        </p>
        <h3>Sources</h3>
        <ul>
          <li>
            Individuals using the Internet, series IT.NET.USER.ZS. ITU, via World Bank World Development Indicators.{" "}
            <a href="https://data.worldbank.org/indicator/IT.NET.USER.ZS">IT.NET.USER.ZS</a>. Licence: CC BY-NC-SA 3.0 IGO. World Bank update 8 Oct 2026, downloaded 24 Oct 2026.
          </li>
          <li>
            GDP per capita, PPP (constant 2021 international $), series NY.GDP.PCAP.PP.KD. World Bank World Development Indicators.{" "}
            <a href="https://data.worldbank.org/indicator/NY.GDP.PCAP.PP.KD">NY.GDP.PCAP.PP.KD</a>. Licence: CC BY 4.0. Downloaded 24 Oct 2026.
          </li>
          <li>
            Population, series SP.POP.TOTL. World Bank World Development Indicators.{" "}
            <a href="https://data.worldbank.org/indicator/SP.POP.TOTL">SP.POP.TOTL</a>. Licence: CC BY 4.0. Downloaded 24 Oct 2026. Sets the dot sizes.
          </li>
          <li>
            ICT Price Baskets, 2008 to 2025. ITU.{" "}
            <a href="https://www.itu.int/en/ITU-D/Statistics/Documents/ICT_Prices/ITU_ICTPriceBaskets_2008-2025.xlsx">Price basket workbook</a>. Licence: CC BY-NC-SA 3.0 IGO. December 2025 release. Prices collected February to March 2025.
          </li>
          <li>
            Poverty and Inequality Platform, 2025 lineup, release 20260922. World Bank. The median is scaled with US CPI-U (BLS series CUUR0000SA0, public domain).{" "}
            <a href="https://www.worldbank.org/en/topic/poverty">World Bank poverty data</a>. PIP and World Development Indicators: CC BY 4.0.
          </li>
          <li>
            Natural Earth 1:50m admin-0 countries, public domain, for the map.{" "}
            <a href="https://www.naturalearthdata.com/downloads/50m-cultural-vectors/">Natural Earth</a>. Antarctica is left out to keep the map readable.
          </li>
        </ul>
        <h3>Ookla notice</h3>
        <p>
          This page does not plot Ookla speeds. They sit in the source dataset under CC BY-NC-SA 4.0. Required attribution: Speedtest by Ookla Global Fixed and Mobile Network Performance Maps was accessed on 24 Oct 2026 from AWS. Based on David Graça's analysis of Speedtest by Ookla data for 2026 Q3. Ookla trademarks used under license and reprinted with permission.
        </p>
        <h3>ITU licence</h3>
        <p>ITU data licensed CC BY-NC-SA 3.0 IGO.</p>
        {noFigures.length > 0 ? (
          <>
            <h3>No figure to plot</h3>
            <ul>
              {noFigures.map((country) => (
                <li key={country.id}>
                  {country.name}
                  {country.onMap ? "" : " (not on this map)"}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {unmapped.length > 0 ? (
          <p>Missing from the map, which has no shape for them: {unmapped.map((country) => country.name).join(", ")}.</p>
        ) : null}
      </div>
    </section>
  );
}
