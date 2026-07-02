# Tanzania Agricultural Prices

Parser and web app for the weekly wholesale food-crop prices published in the
Tanzanian Ministry of Agriculture's **Weekly Market Bulletins**.

The extracted data lives in a separate repository,
[**tanzania-agri-prices-data**](https://github.com/onkelzwerg/tanzania-agri-prices-data)
(CC BY 4.0). This repository holds the code (MIT).

## What's here

This is a [Bun](https://bun.sh) workspace with two packages:

- **`parser/`** — the core: reads a bulletin PDF (`pdfjs-dist`) and returns
  structured price records. Column assignment is done by clustering the x-coordinates
  of the table cells, so a missing cell never silently shifts a row. Ships a CLI
  (`pdf-to-csv`) and a Vitest suite with synthetic fixture PDFs. No DOM dependency —
  runs in the browser and in Node.
- **`app/`** — a [TanStack Start](https://tanstack.com/start) (React 19) web app that
  displays the dataset (filterable table, national trend chart, Excel export). It is
  read-only and loads the data over [jsDelivr](https://www.jsdelivr.com/) from the data
  repository; new weeks are added there, not through the app.

## Quickstart

```bash
bun install
bun run dev       # web app on http://localhost:8080
bun run test      # parser test suite
bun run build     # production build
bun run lint
```

## Extracting a bulletin

```bash
cd parser
bun run pdf-to-csv --out ./out "Weekly Market Bulletin.pdf"
```

This writes one long-format CSV per week (`<week_start>.csv`) and prints a
provenance line (source file + SHA-256) for the data repository. See
[`parser/README.md`](parser/README.md) for the library API and how to add a
test fixture.

## Data source

By default the app reads
`https://cdn.jsdelivr.net/gh/onkelzwerg/tanzania-agri-prices-data@main/data/processed/prices.csv`.
Override with `VITE_DATA_URL` (see [`app/.env.example`](app/.env.example)).

## License

Code is MIT (see [`LICENSE`](LICENSE)). The dataset in the companion repository
is CC BY 4.0. Price figures originate from the Ministry of Agriculture, United
Republic of Tanzania; this is an independent project and not endorsed by the
ministry.
