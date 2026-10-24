import { access } from "./data";

const base = import.meta.env.BASE_URL;

export function About() {
  const { counts, model, noFigures, unmapped } = access;
  const r2 = model.r2.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <section className="block" id="about">
      <p className="section-kicker">About</p>
      <h2>Sources and licences</h2>
      <div className="prose">
        <p>
          By David Graça. This page is non-commercial and has no advertising. Please keep any reuse non-commercial, with no ads.
        </p>
        <p>
          The dashed curve is a logistic fit of internet use on the log of GDP per person. It is fitted to {model.n} countries, all with 2024 figures. R² is {r2}. Predicted use levels off below 100%. The gap is actual internet use minus that prediction, in percentage points. It is a residual from one curve, not a score of policy.
        </p>
        <p>
          Of those {counts.scatter} internet use figures, {counts.official} are official, {counts.ituEstimate} are ITU estimates, {counts.likely} are likely ITU estimates because the latest official figure is older than 2024, and {counts.notStated} do not state an estimate flag in the World Bank copy. {counts.atLeast95} countries are at or above 95% online, so their gap cannot be large.
        </p>
        <p>
          Home broadband cost is the monthly price of the cheapest plan from the largest operator with at least 5 GB and 256 kbit/s, divided by the median person's monthly income or consumption. {counts.atOrBelowTarget} of {counts.withBroadband} countries with a figure are at or below 2%. The UN Broadband Commission target is defined on GNI per capita. Applying it to median income is a reframing. The median is per person, while a connection is shared by a household, so the share overstates the household burden. ITU price baskets are collected prices. ITU does not mark them as estimates.
        </p>
        <h3>Derived data</h3>
        <p>
          Predicted internet use and the gap are offered under CC BY-NC-SA 3.0 IGO, the same licence as the ITU figures they are calculated from. Attribute David Graça, from ITU and World Bank data.{" "}
          <a href={`${base}internet-gap.json`}>Download the derived file (JSON)</a>.
        </p>
        <h3>Sources used on this page</h3>
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
            <a href="https://data.worldbank.org/indicator/SP.POP.TOTL">SP.POP.TOTL</a>. Licence: CC BY 4.0. Downloaded 24 Oct 2026. Used to size the points.
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
            <a href="https://www.naturalearthdata.com/downloads/50m-cultural-vectors/">Natural Earth</a>. Antarctica is omitted so the other countries stay readable.
          </li>
        </ul>
        <h3>Ookla notice</h3>
        <p>
          Ookla speeds are not plotted on this page. They are part of the source dataset, under CC BY-NC-SA 4.0. The required attribution is: Speedtest by Ookla Global Fixed and Mobile Network Performance Maps was accessed on 24 Oct 2026 from AWS. Based on David Graça's analysis of Speedtest by Ookla data for 2026 Q3. Ookla trademarks used under license and reprinted with permission.
        </p>
        <h3>ITU licence</h3>
        <p>ITU data licensed CC BY-NC-SA 3.0 IGO.</p>
        {noFigures.length > 0 ? (
          <>
            <h3>Economies with no plotted figure</h3>
            <ul>
              {noFigures.map((country) => (
                <li key={country.id}>
                  {country.name}
                  {country.onMap ? "" : " (no polygon on this map)"}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {unmapped.length > 0 ? (
          <p>Not drawn, because this map has no polygon: {unmapped.map((country) => country.name).join(", ")}.</p>
        ) : null}
      </div>
    </section>
  );
}
