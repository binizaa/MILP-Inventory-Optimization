# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

The primary way to run the app is as an Electron desktop app:

```bash
npm install        # first time only — installs electron + electron-builder
npm start          # launches the Electron window
```

`main.js` (Electron main process) spins up a localhost HTTP server on a random free port, then opens a `BrowserWindow` pointing at it. This is required because Babel's runtime JSX transform needs HTTP (not `file://`).

As a browser-only fallback (no Electron needed):

```bash
python3 -m http.server 8080
# then open http://localhost:8080/Cocina%20Casa%20Monarca.html
```

To package a distributable:

```bash
npm run build      # outputs to dist/ via electron-builder
```

## Architecture

This is a **no-bundler React SPA**. React 18 and Babel Standalone are loaded from CDN. JSX files are transpiled at runtime by Babel — there is no compilation step.

**No data persistence.** All state is in-memory React. Closing or refreshing the app resets everything to the seed data in `data.js`.

### Script load order (`Cocina Casa Monarca.html`)

Load order is critical because there are no ES modules — each file assigns to `window.*`:

1. `data.js` — seeds `window.INITIAL_INVENTORY`, `window.INITIAL_RECIPES`, `window.INITIAL_ATTENDANCE`, `window.PORTION_MULTIPLIERS`, `window.LOCATIONS`, `window.UNITS`, `window.CATEGORIES`
2. `compute.js` — exports pure functions to `window.CM` (no side effects, no React)
   - `location.js` — `window.CMLocation.getDeviceLocation()`; currently returns a hardcoded position (real geolocation methods go here)
3. `components/Icon.jsx` → `window.Icon`
4. `components/Sidebar.jsx` → `window.Sidebar`
5. `components/DashboardView.jsx` → `window.DashboardView`
6. `components/RecipesView.jsx` → `window.RecipesView`
7. `components/InventoryView.jsx` → `window.InventoryView`
8. `components/AttendanceView.jsx` → `window.AttendanceView`
9. `components/PurchasesView.jsx` → `window.PurchasesView`
10. `app.jsx` — root `App` component, calls `ReactDOM.createRoot`

Any new component file must be added to the HTML `<script type="text/babel">` list **before** `app.jsx`, and must export itself via `window.ComponentName = ComponentName`.

### State management

All React state lives in `App` (`app.jsx`) and is passed down as props:
- `recipes` / `setRecipes` — recipe definitions with ingredients
- `inventory` / `setInventory` — current stock levels
- `appliedAttendance` — the attendance used for all computations
- `draftAttendance` — editable copy; only applied when the user clicks "Actualizar semana"
- `recomputeKey` — bumped to trigger a visual recompute flash in PurchasesView

`app.jsx` also writes `window._att = appliedAttendance` via a `useEffect`. `RecipesView` reads `window._att` to show the live weekly-consumption preview inside the recipe editor — this is the only intentional global bridge between components.

### Compute layer (`window.CM`)

`compute.js` contains all business logic as pure functions:
- `computeDemand(recipes, attendance)` — aggregates ingredient need across all recipes, weighted by portion multipliers (chicas 0.7×, medianas 1.0×, grandes 1.3×)
- `computeShoppingList(recipes, inventory, attendance)` — demand minus stock; returns `status` per row: `"comprar"` (deficit > 0) / `"ajustado"` (stock < need × 1.15) / `"suficiente"`
- `fmtQty(n, unit)` — unit-aware number formatter (kg/L use decimals; pieza rounds to integer)
- `totalPeople(attendance)` / `weightedPeople(attendance)` — raw headcount vs. portion-adjusted equivalent

The low-stock sidebar badge uses a different threshold than the shopping list: it counts items where `qty < need * 0.7`.

### Data model

**Inventory item**: `{ id, name, qty, unit, location, par }` — `par` is the reorder target displayed in RecipesView's ingredient catalog; it is not used in the shopping-list computation. Units: `"kg"`, `"L"`, `"pieza"`. Locations: `"bodega"`, `"refrigerador"`, `"congelador"`.

**Recipe**: `{ id, name, category, note, ingredients: [{ id, qtyPerPerson, unit }] }` — `qtyPerPerson` is for a *medium* portion; small/large are scaled at compute time.

**Attendance**: `{ chicas, medianas, grandes }` — head counts by portion size.

**IDs** are derived from names via slugification (lowercase, NFD-normalized, non-alphanumeric → `-`). New ingredients/recipes get their `id` assigned at save time, not at form-open time.

### Styling

All CSS lives in `styles.css` with a `--cm-*` custom property namespace. No CSS modules or preprocessors. The design references in `_fig/` are Figma exports and are not part of the running app.
