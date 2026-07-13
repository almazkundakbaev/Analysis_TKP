# OMARTA

OMARTA is a TKP/project analysis dashboard with map-based site planning, nearby infrastructure analysis, user accounts, roles, and PostgreSQL-backed project storage.

## Install

```powershell
python -m pip install -r requirements.txt
```

## Local Run Without PostgreSQL

```powershell
python server.py
```

Open:

```text
http://127.0.0.1:8000/
```

Without `DATABASE_URL`, login and projects continue to work in browser `localStorage` for local previews.

The static site can also be published on GitHub Pages without `server.py`. In that mode,
the test administrator uses login `123` and password `123`; authentication and projects
are stored only in that browser's `localStorage`.

## Run With PostgreSQL

Create a database, then set environment variables:

```powershell
$env:DATABASE_URL="postgresql://omarta:change-me@localhost:5432/omarta"
$env:OMARTA_ADMIN_LOGIN="123"
$env:OMARTA_ADMIN_PASSWORD="123"
$env:OMARTA_ADMIN_NAME="Тестовый админ"
python server.py
```

On startup the server applies `database/schema.sql` and creates or synchronizes the configured admin credentials.

## Deployment

Use the included `Procfile`:

```text
web: python server.py
```

Required production variables:

- `DATABASE_URL`
- `OMARTA_ADMIN_LOGIN`
- `OMARTA_ADMIN_PASSWORD`
- `OMARTA_ADMIN_NAME`
- `OMARTA_2GIS_CATALOG_KEY`, if 2GIS Places search is used

The app serves static files and API routes from the same Python server, so no separate frontend build step is required.

## Map Keys

For the interactive map, configure `dashboard/map-config.js`:

```js
window.TKP_MAPS_CONFIG = {
  googleMapsApiKey: "YOUR_GOOGLE_KEY",
  twoGisMapKey: "YOUR_2GIS_MAP_KEY",
  twoGisSearchEndpoint: "/api/2gis/search"
};
```

For 2GIS search, set:

```powershell
$env:OMARTA_2GIS_CATALOG_KEY="YOUR_2GIS_CATALOG_KEY"
```
