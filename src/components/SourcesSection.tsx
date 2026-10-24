import { byId, data } from "../data";
import { fmtGb, fmtUsd, fmtWage, italySentence } from "../format";

export function SourcesSection() {
  const gbYears = data.years.map((year) => `${year} has ${data.coverage.gbByYear[String(year)]} countries`).join(", ");
  const priceYears = data.years.map((year) => `${year} has ${data.coverage.priceByYear[String(year)]} countries`).join(", ");
  const us = byId.get("USA");
  const us2021 = us?.points.find((point) => point.year === 2021)?.price;
  const us2022 = us?.points.find((point) => point.year === 2022)?.price;
  const germany = byId.get("DEU");
  const g2019 = germany?.points.find((point) => point.year === 2019);
  const g2020 = germany?.points.find((point) => point.year === 2020);
  return (
    <details className="sources" id="sources">
      <summary>Sources, definitions and caveats</summary>
      <div className="prose">
        <h3>Coverage rule</h3>
        <p>
          A measure or a year is shown only when it covers at least {data.minCountries} countries. A country is drawn on the time series only when it has a value in at least {data.minYears} of the {data.years.length} years from 2019 to 2023.
        </p>
        <p>
          GB per hour of pay passes in every year: {gbYears}. {data.coverage.gbSeriesCountries} countries have at least {data.minYears} of those years and are drawn on the GB chart. USD per GB passes in every year: {priceYears}. {data.coverage.priceSeriesCountries} countries have at least {data.minYears} price years. The latest snapshot, a 2023 price with the nearest ILO wage, covers {data.coverage.latestGb} countries with a GB figure and {data.coverage.latestPrice} with a price. The ITU file covers {data.coverage.ituEconomies} economies, which is below {data.minCountries}, so it is not used as a ranking.
        </p>
        <h3>How the main figure is computed</h3>
        <p>
          GB per hour of pay = (ILO mean monthly earnings in USD / {data.hours} hours) / Cable median USD price of 1 GB. {data.hours} hours is a standard full-time month. Hours actually worked are not used. Rank 1 buys the most GB. The numbers on the page are the values in the files, not a fresh estimate.
        </p>
        <h3>Sources</h3>
        <ul>
          <li>
            Cable.co.uk, Worldwide mobile data pricing 2023, published via BestBroadbandDeals. The country value is the median USD price of 1 GB across SIM-only consumer plans sampled from July to September 2023, with exchange rates frozen on 7 September 2023.{" "}
            <a href="https://bestbroadbanddeals.co.uk/mobiles/worldwide-data-pricing/">Results page</a>.{" "}
            <a href="https://540k006f.tinifycdn.com/mobiles/worldwide-data-pricing/2023/worldwide_mobile_data_pricing_methodology.pdf">Methodology</a>. The 2019 to 2023 lines use the Historical Data tab of that workbook, one median per country per edition.
          </li>
          <li>
            ILOSTAT, average monthly earnings of employees, total, in USD. Dataflow DF_EAR_EMTA_SEX_ECO_CUR_NB.{" "}
            <a href="https://ilostat.ilo.org/data/">ILOSTAT</a>. The time series matches the wage to the same year as the price. The latest snapshot uses the wage year closest to 2023, inside 2019 to 2025.
          </li>
          <li>
            OECD average annual wages, compared with ILO in the cross-check file. OECD figures are gross pay per full-time equivalent, converted from national currency with the World Bank official exchange rate. ILO figures cover all employees, including part-time workers.{" "}
            <a href="https://sdmx.oecd.org/public/rest/data/OECD.ELS.SAE,DSD_EARNINGS@AV_AN_WAGE,1.0/all?startPeriod=2020&amp;format=csvfilewithlabels">OECD series</a>.
          </li>
          <li>
            ITU ICT Price Baskets, 2008 to 2025. Mobile basket price as a percent of GNI per capita.{" "}
            <a href="https://www.itu.int/en/ITU-D/Statistics/Pages/ICTprices/default.aspx">ITU ICT prices</a>.
          </li>
          <li>
            Natural Earth 1:50m admin-0 countries, for the map.{" "}
            <a href="https://www.naturalearthdata.com/downloads/50m-cultural-vectors/">Natural Earth</a>. Antarctica is omitted so the other countries stay readable. Small territories and French overseas departments are not shown separately.
          </li>
        </ul>
        <h3>Caveats</h3>
        <ul>
          <li>Cable editions are separate snapshots. A jump from one year to the next can be the sample, the country list, or the exchange rate, not only the market. {us2021 != null && us2022 != null ? `The United States median is ${fmtUsd(us2021)} in 2021 and ${fmtUsd(us2022)} in 2022.` : null}</li>
          <li>Wages are a mean for employees. The self-employed and informal workers are not covered. Some national surveys record net pay. France&apos;s Enquête Emploi is one of those.</li>
          <li>{italySentence(data.italy.wage2020, data.italy.wage2021)} Italy is not in the default highlight.</li>
          <li>
            France&apos;s ILO wage is {Math.abs(data.headline.france.oecdPct ?? 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% below the OECD average for {data.headline.france.wageYear}. Portugal&apos;s is {Math.abs(data.headline.portugal.oecdPct ?? 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% below for {data.headline.portugal.wageYear}.
          </li>
          <li>
            Germany has no 2023 ILO wage. The headline {fmtGb(data.headline.germany.gb)} uses the {data.headline.germany.wageYear} wage ({fmtWage(data.headline.germany.wage)}) and the 2023 price ({fmtUsd(data.headline.germany.price)}).
            {g2019?.wage != null && g2020?.wage != null ? ` In the time series the line breaks in 2020, when mean monthly earnings move from ${fmtWage(g2019.wage)} to ${fmtWage(g2020.wage)}.` : null}
          </li>
          <li>A wage-series break is a change of ILO source, an ILO break flag (OBS_STATUS B), or a move of more than 30% in USD earnings in one year. The line stops across a break. The US wage series carries an ILO break flag in 2020.</li>
          <li>China&apos;s ILO figure in the latest snapshot is for 2022 and covers urban private-sector full-time workers only (administrative records).</li>
          <li>ITU baskets are different products. A 1 GB figure is not comparable with a 1.5 GB, 2 GB or 5 GB figure. The percent of GNI is the basket price, not a price per GB.</li>
          <li>
            {data.coverage.unmapped.length} places in the price file have no polygon on this map: {data.coverage.unmapped.join(", ")}. They stay in the table.
          </li>
        </ul>
      </div>
    </details>
  );
}
