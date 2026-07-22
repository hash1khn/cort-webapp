# Traflinq Design System

Design reference for mockups, new features, and marketing surfaces. Sourced from `cort-webapp` (company portal) and `traflinq-landing-page` (marketing site).

---

## Brand

| | |
|---|---|
| **Product name** | Traflinq |
| **Tagline** | The Operating System for Corporate Mobility. |
| **Positioning** | Enterprise mobility intelligence — the architectural foundation for corporate transit |
| **Tone** | Institutional, precise, enterprise-grade. Not playful. Think “command center,” not consumer app. |
| **Audience** | Enterprise mobility managers, CFOs, operations leads, institutional fleet operators |

### Key messaging pillars

- **Intelligence Layer** — logic, oversight, and telemetry for workforce movement at scale
- **Command Center** — real-time visibility across routes, vehicles, and passengers
- **Fiscal Engine** — automated cost auditing, invoice reconciliation, leakage detection
- **Operational Excellence** — move from reactive management to predictive orchestration

### Hero copy (reference)

> **The Intelligence Layer for Managed Mobility**
>
> Traflinq is the architectural foundation for corporate transit. We provide the logic, oversight, and telemetry required to orchestrate workforce movement at an institutional scale.

---

## Color Palette

### Brand colors (constant across themes)

| Token | Hex | Usage |
|---|---|---|
| **Navy** | `#0c225e` | Legacy brand navy, institutional trust |
| **Navy Dark** | `#0a1844` | Deep navy variant |
| **Orange (Primary)** | `#fe8503` | CTAs, active states, highlights, brand accent |
| **Orange Hover** | `#f07a00` / `#fe8503/90` | Button hover states |

### Semantic accents

| Token | Hex | Usage |
|---|---|---|
| Success | `#10b981` | Positive metrics, optimized routes |
| Warning | `#f59e0b` | Alerts, caution banners |
| Danger | `#ef4444` | Errors, destructive actions, inefficiency |
| Info | `#3b82f6` | Informational states |

### Legacy / secondary brand (use sparingly)

| Token | Hex |
|---|---|
| Purple | `#670e4c` |
| Blue | `#09347d` |
| Teal | `#6db9ca` |
| Premium Gold | `#D4AF37` |

### Route / map visualization colors

| Route | Hex |
|---|---|
| Zone A (primary) | `#fe8503` |
| Zone B | `#22d3ee` (cyan) |
| Zone C | `#a78bfa` (violet) |
| Building windows | `#FDE68A` (amber) |

---

## Theme Modes

### Dark mode (default — landing page & dashboard default)

| Token | Value | Usage |
|---|---|---|
| Page background | `#080b14` | Main canvas |
| Card background | `#0d1120` | Cards, sidebar, inputs |
| Card hover | `#111827` | Hover states |
| Subtle surface | `rgba(255,255,255,0.04)` | Hover rows, tinted areas |
| Border default | `rgba(255,255,255,0.07)` | Card borders, dividers |
| Border strong | `rgba(255,255,255,0.12)` | Emphasized borders |
| Text primary | `#ffffff` | Headings, body |
| Text secondary | `rgba(255,255,255,0.65)` | Supporting text |
| Text muted | `rgba(255,255,255,0.35)` | Labels, captions |
| Text placeholder | `rgba(255,255,255,0.25)` | Form placeholders |
| Nav active bg | `rgba(254,133,3,0.10)` | Active sidebar item |
| Nav active text | `#fe8503` | Active nav label |
| Nav inactive | `rgba(255,255,255,0.40)` | Inactive nav items |

### Light mode (dashboard toggle)

| Token | Value |
|---|---|
| Page background | `#f4f6fb` |
| Card background | `#ffffff` |
| Text primary | `#0f172a` |
| Text secondary | `rgba(15,23,42,0.65)` |
| Text muted | `rgba(15,23,42,0.45)` |
| Border default | `rgba(0,0,0,0.07)` |
| Shadow card | `0 2px 12px rgba(0,0,0,0.06)` |

---

## Typography

### Font families

| Role | Font | Fallback |
|---|---|---|
| Sans (UI) | **Geist** | system-ui, sans-serif |
| Mono (code/data) | **Geist Mono** | monospace |
| Arabic (RTL) | **Noto Sans Arabic** | Geist, system-ui |

### Type scale (landing page)

| Element | Size | Weight | Notes |
|---|---|---|---|
| Hero H1 | `2.5rem` → `4.25rem` | Bold (700) | `tracking-tight`, `leading-[1.05]` |
| Section H2 | `2.25rem` → `3rem` | Bold | White on dark |
| Body | `1rem` / `1.125rem` | Regular | `text-white/45` on dark backgrounds |
| Eyebrow / badge | `0.75rem` | Medium | `tracking-widest uppercase` |
| Nav links | `0.875rem` | Medium | `tracking-wide` |
| Sidebar nav | `0.875rem` | Medium | Group labels: `11px bold uppercase` |

### Text color hierarchy (dark)

1. **Primary** — `#ffffff` — headings, key data
2. **Secondary** — `white/65` — descriptions, metadata
3. **Muted** — `white/35–45` — body copy, supporting text
4. **Accent** — `#fe8503` — highlights, active states, icons

---

## Spacing & Layout

### Containers

- **Max width**: `max-w-7xl` (1280px) for marketing sections
- **Horizontal padding**: `px-6 lg:px-8`
- **Section vertical padding**: `py-24 sm:py-32` (landing), `py-4 md:py-8` (dashboard main)

### Grid patterns

- **Landing hero**: 2-column (`lg:grid-cols-2`) — copy left, interactive map right
- **Problem section**: 2-column — copy + SVG visualization
- **Dashboard**: Fixed sidebar + fluid main content area

### Dashboard shell

- **Sidebar width**: `w-72` (expanded) / `w-20` (collapsed)
- **Sidebar radius**: `rounded-[2rem]` — floating pill-style sidebar with `ms-4 my-4` margin
- **Main content**: `max-w-full px-4 md:px-8`
- **Mobile header**: `h-16` sticky top bar

---

## Border Radius

| Element | Radius |
|---|---|
| Buttons | `rounded-md` (6px) / `rounded-lg` (8px) |
| Cards (dashboard) | `rounded-[2rem]` (32px) — signature large radius |
| Cards (landing) | `rounded-2xl` (16px) |
| Sidebar | `rounded-[2rem]` |
| Badges / pills | `rounded-full` |
| Icon containers | `rounded-xl` (12px) |
| Alerts | `rounded-xl` / `rounded-2xl` |
| shadcn base radius | `0.625rem` (10px) |

---

## Shadows & Depth

| Token | Value | Usage |
|---|---|---|
| Card (dark) | `0 2px 12px rgba(0,0,0,0.3)` | Default card elevation |
| Card hover (dark) | `0 8px 24px rgba(0,0,0,0.4)` | Hover lift |
| Modal (dark) | `0 24px 48px rgba(0,0,0,0.6)` | Dialogs, modals |
| CTA button | `shadow-lg shadow-[#fe8503]/20` | Primary action glow |
| Sidebar | `shadow-xl` | Floating sidebar depth |

### Background effects (landing)

- **Grid overlay**: `linear-gradient` 1px lines at `rgba(255,255,255,0.025)`, `4rem` grid
- **Orange glow**: `bg-[#fe8503]/6` blurred circle, `blur-[100px–140px]`
- **Section borders**: `border-t border-white/[0.04]` — subtle section dividers
- **Glass panels**: `bg-white/[0.02]` with `border-white/[0.06]`

---

## Components

### Buttons

**Primary (CTA)**
```
bg-[#fe8503] text-white hover:bg-[#fe8503]/90
px-8 shadow-lg shadow-[#fe8503]/20
text-sm tracking-wide
```

**Ghost / secondary**
```
text-white/50 hover:text-white hover:bg-white/5
```

**Sizes**: `h-9` (default), `h-10` (lg), icon `size-9`

### Badges / eyebrows

```
inline-flex items-center gap-2 rounded-full
border border-[#fe8503]/20 bg-[#fe8503]/5
px-4 py-1.5 text-xs text-[#fe8503]/80
tracking-widest uppercase font-medium
```

Include a pulsing dot: `h-1.5 w-1.5 rounded-full bg-[#fe8503] animate-pulse`

### Cards (dashboard)

```
bg-[var(--bg-card)]
border border-[var(--border-default)]
rounded-[2rem] p-6
shadow-[0_1px_4px_rgba(0,0,0,0.12)]
hover:shadow-[0_2px_10px_rgba(0,0,0,0.18)]
```

Optional left accent border: `border-s-4 border-s-[#fe8503]`

### Cards (landing / glass)

```
rounded-2xl border border-white/[0.06]
bg-white/[0.02] p-8
```

### Icon containers (feature pillars)

```
h-11 w-11 rounded-xl
bg-primary/10 border border-primary/20
```

### Navigation (sidebar)

- Active item: orange left bar (`w-1 rounded-e-full bg-[#fe8503]`) + `bg-[rgba(254,133,3,0.10)]` + orange text
- Inactive: muted text, hover brightens to white
- Icons: Lucide, `size={20}`, `strokeWidth={1.5}` inactive / `2` active

### Navbar (landing)

- Fixed top, transparent → `bg-[#080b14]/95 backdrop-blur-md` on scroll
- Border: `border-white/10` when scrolled
- Logo height: `h-10 sm:h-12`
- Mobile menu button: `rounded-full w-10 h-10 bg-white/5 border border-white/10`

### Alerts

- **Warning**: tinted `accent-warning` at 10% bg, 25% border
- **Brand**: tinted `cort-orange` at 10% bg, 25% border

### Forms

- Inputs use `--bg-input` background, `--border-input` border
- Focus: `--bg-input-focus`
- Checkbox/radio accent: `#fe8503`

---

## Motion & Animation

### Easing

- Primary: `cubic-bezier(0.22, 0.61, 0.36, 1)` — smooth, premium feel
- Standard: `ease-out`

### Patterns

| Animation | Duration | Usage |
|---|---|---|
| Fade in | 0.2–0.3s | Overlays, modals |
| Fade slide up | 0.4–0.5s | Page transitions, mobile nav items |
| Dashboard enter | 0.6s | Staggered section reveals (80ms delays) |
| Modal from button | 0.38s | Popovers anchored to triggers |
| Slide in right | 0.35s | Slide-over panels |
| Hero entrance | 0.7–0.9s | Landing page copy (Framer Motion) |

### Scroll animations (landing)

- `whileInView` with `viewport: { once: true, margin: "-100px" }`
- Staggered delays: `0.1 + i * 0.12` for list items

---

## Icons & Assets

### Icon library

**Lucide React** — stroke icons, consistent with enterprise aesthetic

Common icons: `LayoutDashboard`, `Users`, `Map`, `Calendar`, `Car`, `BarChart2`, `TrendingDown`, `Database`, `DollarSign`, `ArrowRight`, `ChevronRight`

### Logo assets

| File | Usage |
|---|---|
| `traflinq_dark_no_tagline-Photoroom.png` | Dark backgrounds (landing, dark sidebar) |
| `traflinq_light_no_tagline-Photoroom.png` | Light backgrounds (light mode sidebar) |
| `traflinq-logo-big.svg` | Vector logo |
| `favicon.png` | Browser tab |

### Preview images

- `command-center-preview.png`
- `fleet-data-preview.png`
- `ai-insights-preview.png`
- `mobile-mockup.jpeg`

---

## Landing Page Structure

```
Navbar (fixed, blur on scroll)
├── Hero (full viewport, 2-col, animated route map)
├── Problem ("Corporate mobility is broken")
├── Route Optimization
├── About ("Built for institutional scale")
├── Team (Leadership)
├── Operational Success Reports
├── CTA ("Stop managing logistics and start orchestrating movement")
└── Footer
```

### Section pattern

1. **Eyebrow** — `text-xs tracking-widest uppercase text-primary/60`
2. **Headline** — `text-4xl sm:text-5xl font-bold text-white`
3. **Description** — `text-lg text-white/45 leading-8`
4. **Content** — pillars, visuals, or CTAs

### Interactive hero map

- Toggle: "Before" (inefficient detours) vs "Traflinq" (optimized direct routes)
- Isometric city SVG with animated cars on paths
- HQ hub at center, 3 zones (A, B, C) with color-coded routes
- Status badges: red "LONGER ROUTES" vs green "ROUTES OPTIMIZED"

---

## Dashboard Structure

### Portal types

| Portal | Path | Users |
|---|---|---|
| Company | `/company` | Enterprise mobility managers |
| Vendor | `/vendor` | Transport vendors |
| Admin | `/admin` | Internal ops team |

### Company dashboard nav groups

- **Dashboard** — overview metrics, KPIs, charts
- **Employees** — workforce roster
- **Routes** — shuttle route management
- **Bookings** — pool/chauffeur bookings
- **Fleet** — vehicle management
- **Reports** — shuttle/chauffeur analytics
- **Billing** — invoices, cost tracking

### Dashboard UI patterns

- **KPI cards** with sparklines, donut charts, trend indicators
- **Data tables** with row hover (`--row-hover`), muted header text
- **Section titles** with orange icon accent
- **Staggered entrance** — `.dashboard-section` with delay classes
- **Theme toggle** — Sun/Moon icon in sidebar footer
- **RTL support** — Arabic locale with Noto Sans Arabic, mirrored layouts

---

## Internationalization

- **Locales**: English (`en`), Arabic (`ar`)
- **Saudi routes**: `/sa/*` prefix for KSA-specific content
- **RTL**: `html[dir="rtl"]` switches font and flips directional icons
- **LTR content class**: `.ltr-content` for phone numbers, emails, URLs in RTL context

---

## Tech Stack (for reference)

| | Landing Page | Dashboard |
|---|---|---|
| Framework | Next.js 16 | Next.js 16 |
| Styling | Tailwind CSS v4 | Tailwind CSS v4 |
| Components | shadcn/ui (Radix) | Custom + some shadcn |
| Animation | Framer Motion | CSS keyframes |
| Charts | — | Recharts |
| Maps | — | Leaflet, Google Maps |
| Toasts | Sonner | Sonner |

---

## Design Principles

1. **Dark-first** — The brand lives on deep navy-black (`#080b14`). Light mode is supported but secondary.
2. **Orange is the action color** — One accent. Don't introduce competing primaries.
3. **Generous radius** — `2rem` cards and floating sidebar are signature elements. Avoid sharp corners.
4. **Subtle depth** — Low-opacity borders, soft shadows, glass-like surfaces. Not flat, not skeuomorphic.
5. **Institutional copy** — "Orchestrate," "telemetry," "fiscal leakage," "command center." Avoid casual language.
6. **Data-forward** — Charts, maps, and live metrics are first-class. Empty states should feel operational, not decorative.
7. **Motion with purpose** — Staggered reveals and smooth easing signal premium quality. No gratuitous animation.

---

## Quick Reference for Mockups

### Figma / design tool tokens

```
Primary:       #fe8503
Background:    #080b14
Surface:       #0d1120
Border:        rgba(255,255,255,0.07)
Text:          #ffffff
Text muted:    rgba(255,255,255,0.45)
Success:       #10b981
Danger:        #ef4444
Font:          Geist
Card radius:   32px
Button radius: 8px
```

### Sample component specs

**Primary button**: 40px height, 32px horizontal padding, `#fe8503` fill, white text, 8px radius, orange glow shadow

**Dashboard card**: `#0d1120` fill, 1px `rgba(255,255,255,0.07)` border, 32px radius, 24px padding

**Sidebar item (active)**: `rgba(254,133,3,0.10)` background, `#fe8503` text, 4px orange left bar

**Section eyebrow**: 12px, uppercase, wide tracking, `#fe8503` at 60% opacity
