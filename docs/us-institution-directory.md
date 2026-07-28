# Local U.S. institution directory

Cerise Scholar searches a compact, bundled directory of active U.S.
postsecondary institutions. It does not call ROR or another runtime API and it
does not query Supabase while the user types.

## Source and scope

- Source: U.S. Department of Education NCES/IPEDS `HD2024.csv`.
- Official download: <https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip>
- Included rows: `CYACTIVE = 1` and `POSTSEC = 1`.
- Included fields: `UNITID`, `INSTNM`, and `STABBR` only.
- Current compact directory: 5,965 institutions.

The directory is lazy-loaded into the browser only when the U.S. institution
control is used. The generated JSON is kept in a separately loaded client
chunk, so it does not increase the initial account or onboarding bundle.

International institutions and any U.S. institution missing from the official
snapshot use **Outside U.S. / Not listed**. The user's manually entered name is
saved exactly as entered.

## Supabase storage

Only the completed profile is saved:

- `institution`: selected or manually entered name.
- `institution_unitid`: NCES UNITID for a directory selection, otherwise null.

There is no institution lookup table in Supabase and no search history is
stored. This keeps database reads, database storage, and Data API usage out of
the autocomplete flow.

## Refreshing the directory

Download and unzip the next annual IPEDS `HD` data file, update the source year
and URL in `scripts/generate-us-institutions.mjs`, then run:

```bash
node scripts/generate-us-institutions.mjs /path/to/HDYYYY.csv
```

Review the resulting row count and run the institution tests before shipping.
