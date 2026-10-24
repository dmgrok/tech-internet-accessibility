# Cost per GB per country: sources and caveats (built 24 Oct 2026)
1. Cable.co.uk / BestBroadbandDeals, "Worldwide mobile data pricing 2023" (latest edition published; cable.co.uk now redirects to the page below)
   - Page: https://bestbroadbanddeals.co.uk/mobiles/worldwide-data-pricing/
   - Data: https://540k006f.tinifycdn.com/mobiles/worldwide-data-pricing/2023/worldwide_mobile_data_pricing_data.xlsx
   - Method: https://540k006f.tinifycdn.com/mobiles/worldwide-data-pricing/2023/worldwide_mobile_data_pricing_methodology.pdf
   - 5,603 SIM-only consumer plans, 237 countries, sampled Jul to Sep 2023, FX frozen 7 Sep 2023. Country value = MEDIAN USD/GB across the plans (2 to 60 per country). Unlimited-only markets use average usage per user. Cheapest tariff type only where prepaid and postpaid differ a lot. Calls/SMS bundled. Excluded: Bulgaria and 8 others. The sheet's "global average" (2.589) is a simple mean of countries; the Historical tab shows 2.609 for 2023.
   - Note: some 2026 sites (e.g. Mappr) present these same figures as "June 2026". They match the 2023 file exactly, so the label is wrong.
2. ITU ICT Price Baskets 2008 to 2025: https://www.itu.int/en/ITU-D/Statistics/Documents/ICT_Prices/ITU_ICTPriceBaskets_2008-2025.xlsx (page: https://www.itu.int/en/ITU-D/Statistics/Pages/ICTprices/default.aspx)
   - Used 2025: data-only mobile broadband 5 GB basket (i271mb_5GB$ / _GNI), fixed broadband 5 GB basket (i154_FBB5$ / _GNI). Fixed basket = cheapest plan meeting it, monthly. NOT a per-GB price. % GNI = price / (GNI per capita / 12). The 5 GB mobile basket started in 2025 and is not comparable with the 2 GB basket used 2021 to 24.
3. World Bank WDI, GDP per capita (current US$), NY.GDP.PCAP.CD: https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD (2023 used to match the Cable year; 2025 also included in the CSV).
4. Natural Earth 1:50m admin-0 boundaries for the map. Small territories and French overseas departments are not shown separately.

## Wage extension (added 24 Oct 2026)
5. ILOSTAT, "Average monthly earnings of employees by sex, economic activity and currency" (dataflow DF_EAR_EMTA_SEX_ECO_CUR_NB, which replaces EAR_4MTH_SEX_ECO_CUR_NB), from the ILO SDMX API:
   https://sdmx.ilo.org/rest/data/ILO,DF_EAR_EMTA_SEX_ECO_CUR_NB,1.0/?startPeriod=2015&format=csvfilewithlabels (raw file: ilo_ear_emta_sdmx.csv)
   - Filter: SEX_T (total), economic activity total, CUR_TYPE_USD (ILO converts at the average exchange rate for that year). For each country, the year closest to 2023 within 2019 to 2025, with ties going to the later year.
   - Coverage: 137 of the 237 Cable countries. Wage years: 2023 for 79 countries, 2022 for 26, 2021 for 10, 2020 for 8, 2019 for 8, 2024 for 5, 2025 for 1.
   - Data quality: most values come from household labour force surveys run through ILO micro-data processing, and they cover employees only. Some national surveys record net pay (for example, France's Enquête Emploi). China's figure covers urban private-sector full-time workers only (administrative records, 2022).
6. OECD Average annual wages (DSD_EARNINGS@AV_AN_WAGE), national currency, current prices: https://sdmx.oecd.org/public/rest/data/OECD.ELS.SAE,DSD_EARNINGS@AV_AN_WAGE,1.0/all?startPeriod=2020&format=csvfilewithlabels
   - The OECD does not publish this series in USD at market exchange rates; its USD series is PPP-based. I converted it with the World Bank official exchange rate (PA.NUS.FCRF) for the same year. The comparison is in ilo_vs_oecd_crosscheck.csv. OECD figures are gross pay per full-time-equivalent employee; ILO figures are for all employees, including part-timers.
   - For the 39 countries in both: ILO is 40 to 56% lower in Mexico, Turkey, Colombia, Costa Rica, Portugal, France and Chile, and 17 to 32% higher in Italy, Finland, Estonia, Norway, Belgium and Greece.
7. Formulas: minutes per GB = Cable USD per GB / (ILO monthly USD / 173.3 h) x 60. GB per day of pay = (ILO monthly USD / 21.7) / Cable USD per GB. Both use a standard full-time month; ILO data on hours actually worked was not used.
New CSV columns: ilo_wage_year, ilo_mean_monthly_earnings_usd, ilo_obs_status, ilo_source, work_minutes_per_gb, gb_per_day_of_pay, rank_work_minutes, rank_price_within_wage_sample, oecd_avg_wage_monthly_usd_same_year, ilo_vs_oecd_pct.

## Industrial electricity prices (added 24 Oct 2026): energy_prices.csv, energy_industrial_price.png, energy.py
8. Eurostat nrg_pc_205, "Electricity prices for non-household consumers, bi-annual data" (updated 19 Oct 2026). API: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_205 (raw file: eurostat_nrg_pc_205.json)
   - Band ID (2,000 to 19,999 MWh/year), EUR/kWh, tax = X_VAT (excluding VAT and other recoverable taxes and levies). X_TAX (excluding all taxes) is also in the CSV. 2025 = simple average of 2025-S1 and 2025-S2, the same convention DESNZ uses. Eurostat has no UK data after Brexit. 2026-S1 is also available but has no US/UK match.
9. UK: DESNZ Quarterly Energy Prices table 5.4.2, medium non-domestic consumers (2,000 to 19,999 MWh), including taxes and excluding VAT, in pence/kWh (published 28 May 2026): https://assets.publishing.service.gov.uk/media/6a1565099819be865f421cda/table_541.xlsx. The 2025 values are 26.61 p (Jan to Jun) and 25.08 p (Jul to Dec). DESNZ's national table 3.4.1/3.4.2 uses different bands and was not used: https://assets.publishing.service.gov.uk/media/6ab543da997a4b2950cceedc/table_341.xlsx
10. US: EIA Electric Power Monthly table 5.3, average price to ultimate customers, industrial sector, 2025 annual = 8.51 cents/kWh: https://www.eia.gov/electricity/monthly/xls/table_5_03.xlsx. This is average revenue per kWh across all industrial customers of all sizes, not split by consumption band.
11. Exchange rates: ECB annual average reference rates for 2025, 1 EUR = 1.12998 USD and 0.85679 GBP. https://data-api.ecb.europa.eu/service/data/EXR/A.USD.EUR.SP00.A and A.GBP.EUR.SP00.A
12. IEA comparison: not included. DESNZ removed its IEA-based table 5.3.1 on 29 Sep 2026 to comply with IEA terms of use, and the IEA's own price data is paid. In the 2024 IEA industrial table, the US did not report.

## Clearer framing and trends (added 24 Oct 2026): clear_metric.py, trend_charts.py
13. Recommended framing: GB of mobile data that one hour of average pay buys = (ILO mean monthly earnings / 173.3 h) / Cable USD per GB. CSV columns: gb_per_hour_of_pay, pct_monthly_pay_for_20gb, rank_gb_per_hour (1 = most GB). Reference and EU table: clear_metric_reference_eu.csv. 26 of the 27 EU countries have data; Bulgaria is missing because it has no Cable price.
14. Typical monthly use (20 GB, used only as a reference volume): Ericsson Mobility Report, Nov 2025, and its key-figures page. Data traffic per active smartphone is 21 to 22 GB/month globally in 2025, and 25 GB in Western Europe and North America. https://www.ericsson.com/en/reports-and-papers/mobility-report/key-figures
15. Price trend, 2019 to 2023: Cable.co.uk 2023 workbook, "Historical Data" tab, with one value per country per edition. Earlier edition files are no longer downloadable (403/404 on the CDN), so the methodology of each edition could not be checked. Each edition has its own plan sample, country sample and exchange rates. Global averages come from the results page: 8.18, 5.09, 4.07, 3.12, 2.61. File: timeseries_cable_ilo_2019_2023.csv
16. Wage trend: ILOSTAT, same series as item 5, matched by year. A row is flagged wage_break when the ILO source changes, ILO marks a break (B), or USD earnings move more than 30% in a year (my own flag for a suspected break). Known breaks:
   - Italy, 2021: labour force survey (about $1,560) replaced by EU-SILC (about $3,640).
   - Germany, 2020: EU-SILC rises 50%.
   - UK, 2019: ASHE instead of LFS.
   - Spain, 2019: LFS replaced by EU-SILC.
   - US, 2020: ILO break flag.
17. ITU affordability series: itu_mobile_affordability_series.csv. Baskets, never joined across changes:
   - 1 GB postpaid computer-based, 2013 to 2017
   - 1.5 GB data-only, 2018 to 2020
   - 2 GB data-only, 2021 to 2025
   - 5 GB data-only, 2022 to 2025, the headline basket from 2025
