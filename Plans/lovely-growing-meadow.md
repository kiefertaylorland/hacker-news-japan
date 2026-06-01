# UI Redesign — Hacker News Japan (shadcn + Tailwind, dark/glass refinement + JP type)

## Context

`hacker-news-japan` is a Next.js 15 single-page app that searches the Algolia HN API
(auto-prepending "Japan" to every query) and renders results in a dark glassmorphism UI. The
owner wants a **full visual overhaul** that **keeps and refines the dark/glass aesthetic**, **adds
proper Japanese typography** (only Inter/Latin is loaded today), and is **built with the shadcn
and Tailwind CSS MCP/CLI tooling** rather than ad-hoc hand-rolled markup.

Today the dashboard components are hand-rolled `<div>`/`<button>` markup styled with custom
`.glass*` / `.badge-*` classes in `globals.css`. The project already has `components.json`
(shadcn, New York, slate) but **no shadcn primitives are installed**. This redesign adopts shadcn
base components, themes them for dark/glass + HN orange, and rebuilds the dashboard on top.

Confirmed with the user: keep dark/glass (refine), full overhaul, add a Japanese font.

## Decisions (grounded in MCP queries)

- **Component base:** install shadcn UI primitives via CLI and rebuild dashboard components on
  them. Chosen primitives (from `@shadcn` registry, all `registry:ui`):
  `card`, `badge`, `button`, `input-group` (search box: leading search icon + trailing clear
  button), `toggle-group` (segmented controls for story-type + sort, replacing the hand-rolled
  button rows), `select` (date range), `pagination`, `skeleton`, `empty` (no-results state),
  `separator`, `tooltip`.
  - **CLI command (verified via shadcn MCP):**
    `npx shadcn@latest add @shadcn/card @shadcn/badge @shadcn/button @shadcn/input-group @shadcn/toggle-group @shadcn/select @shadcn/pagination @shadcn/skeleton @shadcn/empty @shadcn/separator @shadcn/tooltip`
  - Components land in `src/components/ui/` per the existing `components.json` aliases.
- **Theme via CSS variables:** flip `components.json` `cssVariables: false → true` so all shadcn
  components inherit one dark theme. Define the token set in `globals.css` under `.dark`
  (`--background`, `--card`, `--popover`, `--border`, `--input`, `--ring`, `--muted`,
  `--muted-foreground`, `--primary` = HN orange, `--foreground`, etc.). This is the standard
  shadcn theming path and what makes "use shadcn properly" cohesive.
- **HN-orange palette (generated via Tailwind MCP `generate_color_palette`):**
  `50 #ffb900 · 100 #ffaf00 · 200 #ff9d00 · 300 #ff8b00 · 400 #ff7800 · 500 #ff6600 ·
  600 #d65600 · 700 #ad4500 · 800 #853500 · 900 #5c2500 · 950 #471d00`.
  Add as `colors.hn` scale in `tailwind.config.ts` (replacing the single `hn: "#FF6600"`); map
  `--primary`/`--ring` to `hn-500`. Lighter shades skew golden — use them for glow/hover only.
- **Glassmorphism, refined:** keep the frosted look but standardize it. Override shadcn card/
  popover surfaces with translucent bg + `backdrop-blur` via the `.glass*` classes (kept, retuned
  to the new tokens) rather than shadcn's default solid surfaces. One elevation scale, consistent
  border/blur/shadow.
- **Japanese typography:** add **Noto Sans JP** via `next/font/google` in `layout.tsx`, paired
  with Inter as the Latin face. Expose both as CSS variables and set
  `fontFamily.sans = [Inter, "Noto Sans JP", ...]` in `tailwind.config.ts` so mixed JP/EN text
  renders correctly. Tune `line-height`/letter-spacing for CJK.

## Files to change

- `components.json` — `cssVariables: true`.
- `src/components/ui/*` — **new**, added by the shadcn CLI command above.
- `src/app/globals.css` — define `.dark` CSS-variable token set; retune `.glass`, `.glass-input`,
  `.glass-button`, `.badge-*` to the new tokens; keep the body gradient backdrop.
- `tailwind.config.ts` — `hn` color scale; `fontFamily.sans` with Noto Sans JP; keep
  `fade-in`/`slide-up` + `backdropBlur.md`.
- `src/app/layout.tsx` — add Noto Sans JP `next/font` alongside Inter; wire font CSS variables.
- `src/components/dashboard/*` — rebuild each on shadcn primitives, **preserving all existing
  props, state wiring, and data flow** (`useSearch`, `lib/algolia.ts`, `lib/api.ts` untouched):
  - `SearchBar` → `input-group` (search icon + clear button)
  - `FilterBar` → `toggle-group` (story type) + `select` (date range)
  - `SortControls` → `toggle-group`
  - `StoryCard` / `StoryCardSkeleton` → `card` + `badge` + `skeleton`; keep left-accent-by-type
  - `StoryGrid` → keep responsive grid + staggered entrance; `empty` for no results
  - `Pagination` → `pagination`
  - `ResultsHeader`, `Dashboard`, `DashboardSkeleton` → restyle to new tokens
- **Data layer untouched:** `src/hooks/*`, `src/lib/*`.

## Verification

- `npx shadcn@latest add ...` succeeds; components appear in `src/components/ui/`.
- Run the shadcn MCP `get_audit_checklist` after generating components and follow it.
- `npm run dev` — visually confirm refined dark/glass look, HN-orange accents, all controls.
- Test a **Japanese** query/string to confirm Noto Sans JP renders CJK correctly.
- `npm run build` (static `output: "export"`) passes with no type/lint errors.
- Behavior intact: search + debounce, story-type/date/sort filters, pagination, URL sync,
  loading skeletons, empty + error states.
