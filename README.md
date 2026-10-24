# Tech and internet accessibility

By David Graça. A static site with two pages.

- Home links to both pages.
- What an hour of pay buys in mobile data.
- Richer countries are more online, but not all of them.

The internet and income page is preliminary. The figures stay under review until the open checks are closed.

Published site: https://dmgrok.github.io/tech-internet-accessibility/

Vite `base` is `/tech-internet-accessibility/`, so asset paths match that GitHub Pages URL.

## Run it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4737/tech-internet-accessibility/

```bash
npm run build          # site in dist/
npm run build:single   # one offline file for the hour-of-pay page
npm run data:access    # rebuild the internet page JSON from data/internet/
```

`npm run build` reruns the internet page data script, then typechecks and builds.

## GitHub Pages

`.github/workflows/pages.yml` builds `dist/` and deploys it when `main` is pushed.

In the repository settings, open Pages and set the source to GitHub Actions. After the first successful run on `main`, the site is at the URL above.

## Internet use and income

`data/internet/page_countries.csv` is the country file for that page. It keeps the columns the page plots. The long country file is not in this repo, and unicorn counts are not in this repo.

`data/internet/gap_model.json` holds the logistic curve.

`scripts/prepare_access.py` writes `src/data/accessData.json` (what the page loads) and `public/internet-gap.json` (the derived file offered under CC BY-NC-SA 3.0 IGO).

The page is non-commercial and has no advertising. ITU data are CC BY-NC-SA 3.0 IGO. Ookla open data are CC BY-NC-SA 4.0 and are not plotted here. World Bank sources are named on the page.

## What an hour of pay buys in mobile data

One hour of average pay buys **66.7 GB** of mobile data in France, **12.5 GB** in Germany and **5.1 GB** in the United States, at 2023 Cable.co.uk prices. Germany has no 2023 ILO wage, so 12.5 GB uses the 2022 wage.

The page is a static site: a headline, a 2019 to 2023 line chart, a ranking linked to a world map, an ITU affordability trend, and a collapsed sources section. On the built site it lives at `hour-of-pay/`.

`dist-single/index.html` has the JavaScript, the data and the map inlined. Double-click it to open the hour-of-pay page offline. That file uses relative asset paths.

## Data

Source files for the hour-of-pay page live in `data/raw/`. Rebuild the JSON that page imports with:

```bash
python3 -m pip install pyshp
npm run data
```

`scripts/prepare_data.py` reads the Cable, ILO, ITU and OECD cross-check tables and the Natural Earth 1:50m countries, then writes `src/data/appData.json` and `src/data/world.json`.

`scripts/strip_dashes.py` replaces the en dashes and em dashes that ship inside the ECharts Chinese locale, then `scripts/check_dashes.py` fails the build if any remain.

## Coverage rule

A measure or a year is shown only when it covers at least **30 countries**. A country is drawn on the time series only when it has a value in at least **3 of the 5 years** from 2019 to 2023.

GB per hour of pay, same year price and wage:

| Year | Countries |
| --- | --- |
| 2019 | 112 |
| 2020 | 92 |
| 2021 | 89 |
| 2022 | 97 |
| 2023 | 79 |

**89** countries have at least 3 of those 5 years and are drawn on the GB chart.

USD per GB:

| Year | Countries |
| --- | --- |
| 2019 | 227 |
| 2020 | 228 |
| 2021 | 230 |
| 2022 | 233 |
| 2023 | 237 |

**230** countries have at least 3 price years. The latest snapshot (2023 price, ILO wage closest to 2023) covers **137** countries with a GB figure and **237** with a price.

The ITU file covers **9** economies, which is under 30, so it is a selected trend and not a world ranking.

## Definitions

GB per hour of pay = (ILO mean monthly earnings in USD / 173.3 hours) / Cable median USD price of 1 GB. 173.3 hours is a standard full-time month. The page uses the values already stored in the CSVs.

A wage-series break (gap, and a hollow marker on a highlighted line) is a change of ILO source, an ILO break flag (`OBS_STATUS` B), or a move of more than 30% in USD earnings in one year.

## Data notes

- France's ILO wage is 40.2% below the OECD average for 2023. Portugal's is 45.0% below. OECD wages are gross pay per full-time equivalent. ILO wages cover all employees, and France's labour force survey records net pay.
- Italy switched to gross pay in 2021 (labour force survey to EU-SILC: 1,560 USD in 2020, 3,640 USD in 2021). GB per hour is overstated. Italy is not in the default highlight.
- The United States median price is $3.33 in 2021 and $6.88 in 2022. Cable editions are separate samples.
- Ten places in the price file have no polygon on the 1:50m map (Gibraltar, several French overseas departments, and a few islands). They stay in the table.
