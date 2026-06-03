# UI Implementation — Rev.Tech Full Brand Re-skin

Implements the mockups in `docs/UI/` (all 19 images) across the entire application, replacing the previous grayscale placeholder tokens with the brand palette, updating typography, adding a loading screen, and restructuring the Connect page layout.

---

## Scope

- **Color system** — Replaced all grayscale `:root` CSS variables with the brand palette from `Colors Used.png`; added section-specific background tokens (mint, yellow, pink, lavender) and a purple accent token for buttons.
- **Typography** — Changed default body font from Inter to **DM Sans** (per mockup spec). Headers remain **Plus Jakarta Sans**.
- **Loading screen** — New `LoadingScreen` component: full-screen white overlay with a thin animated gradient bar on the right edge (green→yellow→pink→purple) and percentage counter bottom-right. Mounts on initial app load with a 1.5s simulated delay.
- **Home page** — Each of the 4 sections now uses a unique pastel background (mint for hero, yellow for assessment, pink for roadmap, lavender for connect). Footer changed from dark (`bg-ink`) to white (`bg-surface`) with divider lines between links.
- **Auth pages** — Left panel now shows a randomly-cycled Pexels photo (one of three `auth-1.jpg` / `auth-2.jpg` / `auth-3.jpg`). Buttons use the purple accent (`btn-purple`). Inputs have dark borders (`border-divider`) on white background instead of gray placeholder bg.
- **Assessment page** — Background changes to `bg-section-assess` (yellow) for the form, result view background shifts to mint or pink based on repair/recycle direction. Form wrapped in a white rounded card. Buttons use purple accent.
- **Connect (map) page** — Layout restructured to full-height split: map fills the left side, a right panel (~384px) contains header, filter chips (All / Repair Centers / Recycling Centers), and station list with distance info. Search bar overlays the map top-left. Keeps existing Leaflet map implementation.
- **Roadmap page** — Background changes to `bg-section-roadmap` (pink). Content wrapped in a large white rounded card with progress bar and step nodes. All brand-green/brand-amber color classes replaced with neutral `bg-ink`/`bg-purple` tokens.
- **Account (profile) page** — Gray color tokens replaced with `text-ink`/`text-muted`/`bg-surface`/`bg-canvas`. Avatar circle uses purple accent.
- **Sidebar** — Collapsed state shows a white square header (no logo). Expanded state reveals Rev.Tech text.
- **Images** — 3 Pexels photos moved from `docs/images/` to `frontend/public/images/` with convenient names.
- **Navbar.tsx** — Deleted (orphaned component, no longer imported anywhere).

---

## Files changed

### New

| File | Purpose |
| --- | --- |
| `frontend/src/components/LoadingScreen.tsx` | Animated loading screen with gradient bar + percentage counter |
| `frontend/src/utils/authImages.ts` | Utility to pick a random auth background image |
| `frontend/public/images/auth-1.jpg` | Pexels photo for auth page left panel (Tima Miroshnichenko) |
| `frontend/public/images/auth-2.jpg` | Pexels photo for auth page left panel (Phong Thanh) |
| `frontend/public/images/auth-3.jpg` | Pexels photo for auth page left panel (Elias Gamez) |

### Modified

| File | Change |
| --- | --- |
| `frontend/index.html` | Removed Inter from Google Fonts, kept DM Sans + Plus Jakarta Sans |
| `frontend/tailwind.config.js` | Added `purple`, `purple-fg`, `section-hero`, `section-assess`, `section-roadmap`, `section-connect` color tokens; changed `font-sans` default to DM Sans |
| `frontend/src/index.css` | Replaced all grayscale `:root` variables with brand palette; added section bg tokens and purple accent; added `btn-purple` component class; added `animate-wipe-in` keyframe; changed `body` to use DM Sans |
| `frontend/src/App.tsx` | Integrated `LoadingScreen` on initial mount |
| `frontend/src/components/Home.tsx` | Section-specific background colors (`bg-section-hero`, `bg-section-assess`, `bg-section-roadmap`, `bg-section-connect`); footer changed to white bg with dark text |
| `frontend/src/components/Sidebar.tsx` | Header logo block: white square when collapsed, Rev.Tech text when expanded |
| `frontend/src/features/auth/AuthLayout.tsx` | Left panel uses random Pexels photo via `getRandomAuthImage()`; added photo credit overlay |
| `frontend/src/features/auth/LoginPage.tsx` | Login button changed to `btn-purple`; restyled inputs with dark borders |
| `frontend/src/features/auth/RegisterPage.tsx` | Create Account button changed to `btn-purple`; "Password Requirements" link added; Back to Login button in confirmation state uses `btn-purple` |
| `frontend/src/features/assess/AssessPage.tsx` | Section backgrounds (yellow for form, mint/pink for results); form wrapped in white card; purple buttons; severity radio selected state uses `border-purple bg-purple/30` |
| `frontend/src/features/connect/ConnectPage.tsx` | Full-height split layout (map left + info panel right); filter chips (All / Repair Centers / Recycling Centers) in right panel; search overlay on map; purple-ish background |
| `frontend/src/features/connect/StationList.tsx` | Updated color tokens (text-gray-* → text-ink/muted, bg-* → bg-ink/*, etc); icons use Lucide `Wrench`/`Recycle` |
| `frontend/src/features/navigate/NavigatePage.tsx` | Pink background (`bg-section-roadmap`); content wrapped in white rounded card; all brand/styling tokens replaced with `bg-ink`/`bg-purple`/`text-ink`/`text-muted` |
| `frontend/src/features/auth/ProfilePage.tsx` | Replaced gray/green color tokens with `text-ink`/`text-muted`/`bg-surface`/`bg-canvas`/`bg-purple`; avatar circle uses purple accent |

### Deleted

| File | Reason |
| --- | --- |
| `frontend/src/components/Navbar.tsx` | Orphaned — no longer imported anywhere after sidebar introduction |

---

## Design system

### Color palette

```css
:root {
  --color-canvas:       249 250 251;   /* #F9FAFB — page background */
  --color-surface:      255 255 255;   /* #FFFFFF — cards, panels */
  --color-ink:          17 25 40;      /* #111928 — primary text */
  --color-muted:        99 115 129;    /* #637381 — secondary text */
  --color-subtle:       190 193 200;   /* #BEC1C8 — tertiary */
  --color-divider:      230 230 230;   /* #E6E6E6 — borders */
  --color-placeholder:  190 193 200;   /* #BEC1C8 — inputs */

  --color-section-hero:     172 239 200;  /* #ACEFC8 — mint */
  --color-section-assess:   240 228 173;  /* #F0E4AD — yellow */
  --color-section-roadmap:  246 216 254;  /* #F6D8FE — pink */
  --color-section-connect:  217 216 255;  /* #D9D8FF — lavender */

  --color-purple:      217 216 255;   /* #D9D8FF — button bg */
  --color-purple-fg:   17 25 40;      /* text on purple */
}
```

### Typography

| Family | Tailwind utility | Used for |
| --- | --- | --- |
| Plus Jakarta Sans | `font-display` | `h1`–`h4` and display text |
| DM Sans | `font-sans` (default) | Body, UI, everything else |

---

## Auth image cycling

The `AuthLayout` left panel selects a random image from 3 Pexels photos on every page mount/refresh. All 3 auth pages (Login, Register, confirmation) share the same randomly-selected image in a single session.

---

## Loading screen behavior

- **Initial load**: `LoadingScreen` appears for ~1.5s on first app mount, then fades away.
- **Route transitions**: A CSS wipe animation (`animate-wipe-in`, right-to-left) plays on route changes (available for future activation).

---

## Sidebar behavior (unchanged from previous version)

| Viewport | Default | Trigger | Result |
| --- | --- | --- | --- |
| Desktop (`md+`) | Narrow icon rail always visible | Pointer enters sidebar | Expands to `--sidebar-width-open`; leaves collapses |
| Mobile (`< md`) | Hidden off-screen | Tap hamburger | Drawer slides in over backdrop |
| Mobile | Drawer open | Tap X or backdrop | Closes |

---

## Verification

```bash
cd frontend
npm run typecheck   # passes
npm run build       # passes
```

---

## Follow-ups

- Wire Footer links (`Terms of Service`, `Privacy Policy`, `Contact Us`) to real routes.
- Implement the language switcher in `AuthLayout` (currently a static button).
- Wire the Google sign-in buttons in `LoginPage` / `RegisterPage` to the OAuth flow.
- Replace `btn-placeholder` buttons (Google sign-in, "No account yet?" banners) with proper styled variants.
- Add route transition wipe animation (CSS `animate-wipe-in` defined but not wired).
- The LoadingScreen currently uses a simple `setInterval` for demo progress — replace with actual app readiness detection.
