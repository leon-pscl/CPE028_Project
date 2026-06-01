# UI Implementation — Rev.Tech mockups

Implements the mockups in `docs/UI/` (Home1–4, Home1Extend, Login, Sign-up, Sign-up Confirmation) across the Home page, auth pages, and global navigation.

> Colors are intentionally left as grayscale placeholders. All theme values are centralized as CSS variables so the brand palette can be applied later without touching components.

---

## Scope

- **Sidebar nav** — replaces the previous top navbar (`Navbar.tsx`).
- **Home page** — single scrolling page with four sections matching `Home1`–`Home4`, plus the REV.TECH footer.
- **Auth pages** — `Login`, `Register` (+ confirmation state), `ForgotPassword`, `AuthCallback`.

Feature pages (`AssessPage`, `NavigatePage`, `ConnectPage`, `ProfilePage`) and `Breadcrumbs` are intentionally untouched.

---

## Files changed

### New

| File | Purpose |
| --- | --- |
| `frontend/src/components/Sidebar.tsx` | Collapsible icon rail; hover-to-peek, click-to-pin, mobile drawer, scroll-spy highlight on home |
| `frontend/src/components/nav.ts` | Single source of truth for nav items and home section IDs |
| `frontend/src/hooks/useScrollSpy.ts` | `IntersectionObserver`-based hook for active-section tracking |
| `frontend/src/features/auth/AuthLayout.tsx` | Shared split layout (image placeholder + form panel + language switcher) |

### Modified

| File | Change |
| --- | --- |
| `frontend/index.html` | Title/meta to Rev.Tech; load Bricolage Grotesque + Inter; body uses new tokens |
| `frontend/tailwind.config.js` | Semantic color tokens (`canvas`, `surface`, `ink`, `muted`, `subtle`, `divider`, `accent`, `accent-fg`, `placeholder`) bound to CSS variables; `font-display` family; `tracking-display`; `max-w-content` |
| `frontend/src/index.css` | CSS variable palette in `:root`; new `.btn-accent` / `.btn-placeholder`; legacy `.btn-primary` / `.btn-secondary` aliased so existing pages still render |
| `frontend/src/App.tsx` | Sidebar layout; full-bleed routing for auth routes |
| `frontend/src/components/Home.tsx` | Four full-screen sections (`hero` / `assess` / `roadmap` / `connect`) + REV.TECH footer |
| `frontend/src/features/auth/LoginPage.tsx` | Rebuilt to match `Login.png` |
| `frontend/src/features/auth/RegisterPage.tsx` | Rebuilt to match `Sign-up.png`; submit-success state matches `Sign-up Confirmation.png`. First/Last name now separate; role selector restyled |
| `frontend/src/features/auth/ForgotPasswordPage.tsx` | Restyled to use `AuthLayout` and new tokens |
| `frontend/src/features/auth/AuthCallbackPage.tsx` | Restyled to use new tokens |

### Orphaned (safe to delete)

- `frontend/src/components/Navbar.tsx` — no longer imported anywhere.

---

## Design system

Re-skinning later only requires editing `:root` in `frontend/src/index.css`. Every button, surface, border, and placeholder reads from these tokens.

```css
:root {
  --color-canvas:       217 217 217;   /* page background */
  --color-surface:      245 245 245;   /* panels, sidebar, form area */
  --color-ink:          17 17 17;      /* primary text + active states */
  --color-muted:        90 90 90;      /* secondary text */
  --color-subtle:       140 140 140;   /* tertiary text / icon */
  --color-divider:      200 200 200;   /* default borders */
  --color-accent:       17 17 17;      /* primary buttons */
  --color-accent-fg:    255 255 255;   /* text on accent */
  --color-placeholder:  217 217 217;   /* inputs, gray button blocks, image slots */

  --sidebar-width:        4.5rem;      /* collapsed sidebar width */
  --sidebar-width-open:   16rem;       /* expanded sidebar width */
}
```

Values are space-separated RGB channels so Tailwind alpha modifiers work (e.g. `bg-accent/80`).

### Typography

Loaded from Google Fonts in `index.html`. Wired up as Tailwind families:

| Family | Tailwind utility | Used for |
| --- | --- | --- |
| Plus Jakarta Sans | `font-display` | `h1`–`h4` and other large display text |
| Inter | `font-sans` (default) | Body, UI |
| DM Sans | `font-dm-sans` | Available for accents / overrides |

Swap any element to a different family with the utility (e.g. `<p className="font-dm-sans">`), or change the default mapping in `tailwind.config.js`.

---

## Sidebar behavior

| Viewport | Default | Trigger | Result |
| --- | --- | --- | --- |
| Desktop (`md+`) | Narrow icon rail always visible (overlay) | Pointer enters sidebar | Expands to `--sidebar-width-open`; mouse-leave collapses |
| Mobile (`< md`) | Hidden off-screen | Tap the menu (hamburger) at top-left | Slides in expanded over a backdrop |
| Mobile | Drawer open | Tap the **X** in the sidebar header (or tap the backdrop) | Closes the drawer |
| Any | Click a nav item, or route changes | — | Drawer closes automatically |

Active item — route match, or scroll position when on `/` — shown as a white panel with a left ink bar.

Scroll-spy is driven by section IDs (`hero`, `assess`, `roadmap`, `connect`) declared in `nav.ts` and consumed by both `Home.tsx` and `Sidebar.tsx`. When on `/`, clicking a sidebar item scrolls smoothly to its section instead of routing away.

---

## Image placeholders

The mockups’ gray blocks are treated as future image slots:

- **Home sections** — right-hand column in the section grid is empty on `lg+`; drop in art or a media component when ready.
- **Auth pages** — left panel uses `bg-placeholder`; replace with brand visual / illustration.
- **Sidebar header** — top-left square is `bg-ink`; swap for the Rev.Tech mark when finalized.

---

## Verification

```bash
cd frontend
npm run typecheck   # passes
npm run build       # passes
```

`npm run lint` currently errors because `eslint.config.js` is missing — pre-existing, unrelated to this change.

---

## Follow-ups

- Replace placeholder art slots with real imagery / illustrations.
- Wire Footer links (`Terms of Service`, `Privacy Policy`, `Contact Us`) to real routes.
- Implement the language switcher in `AuthLayout` (currently a static button).
- Wire the Google sign-in buttons in `LoginPage` / `RegisterPage` to the OAuth flow.
- Decide on the final brand palette and update the `:root` tokens.
- Delete `frontend/src/components/Navbar.tsx` once the new Sidebar is approved.
