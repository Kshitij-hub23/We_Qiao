# Qiáo — Visual Style Guide (for the landing page)

> **Purpose:** Everything you need to build a landing page that matches the Qiáo product app
> exactly — colour palette, typography, glass/blur effects, shadows, buttons, motion, voice.
> All values below are copied verbatim from the live app (`tailwind.config.ts`, `app/globals.css`,
> and the component library). Use them as-is.

---

## 1. The vibe in one paragraph

Qiáo (橋, "bridge") is a warm, calm, **"coffee-house" healthtech** aesthetic — espresso-dark text on
latte-cream surfaces, with mocha and burnt-terracotta accents. It borrows **Apple "Liquid Glass"**
restraint: frosted translucent cards, soft brown-tinted shadows, generous rounded corners, and quiet
spring-physics motion. It should feel **trustworthy, premium, and human** — never clinical, neon, or
"techy-blue." Think a high-end café menu meets a medical record you'd actually trust your grandmother's
health to.

**Keywords:** warm · frosted glass · espresso & cream · terracotta accent · rounded · soft depth · serif headlines · understated motion.

---

## 2. Colour palette

The app uses 4 token families. **Brand (mocha)** is primary, **Teal-token (terracotta)** is the highlight/accent
(note: it's named `teal` in code but the values are warm orange — there is **no actual teal/blue anywhere**),
**Ink** is the warm neutral/text scale, and **Severity** is the alert scale for conflict flags.

### Brand — warm coffee / mocha (PRIMARY)
| Token | Hex | Typical use |
|---|---|---|
| brand-50  | `#faf4ee` | tint backgrounds, hover fills |
| brand-100 | `#f2e6d8` | chips, soft fills |
| brand-200 | `#e6cfb5` | borders, focus ring border |
| brand-300 | `#d4ad84` | focus ring, ambient gradient |
| brand-400 | `#bd8553` | background gradient wash |
| brand-500 | `#a3673a` | **primary buttons, links, the "·" accent dot** |
| brand-600 | `#8a5530` | button hover |
| brand-700 | `#6f4327` | link hover, chip text |
| brand-800 | `#5a3722` | deep accents (e.g. patient-ID mono text) |
| brand-900 | `#4a2f1f` | **the single standardized bullet/indicator colour** |

### Teal-token — terracotta / burnt caramel (ACCENT / HIGHLIGHT)
| Token | Hex | Typical use |
|---|---|---|
| teal-50  | `#fdf2ea` |
| teal-100 | `#fbe1cf` | caregiver role badge bg |
| teal-200 | `#f5c19e` |
| teal-300 | `#ec9b69` |
| teal-400 | `#e07a3e` |
| teal-500 | `#cf6326` | **secondary accent / highlight** |
| teal-600 | `#b04f1d` |
| teal-700 | `#8d3f1a` | caregiver role badge text |
| teal-800 | `#71341a` |
| teal-900 | `#5d2d18` |

### Ink — warm taupe → espresso (NEUTRALS & TEXT)
| Token | Hex | Typical use |
|---|---|---|
| ink-50  | `#f7f2ec` |
| ink-100 | `#efe7dc` | practitioner role badge bg |
| ink-200 | `#e0d3c3` |
| ink-300 | `#c8b6a0` | disabled state, chevrons |
| ink-400 | `#a3917c` | muted/placeholder text, captions |
| ink-500 | `#7d6c59` | secondary text |
| ink-600 | `#5f5142` | labels |
| ink-700 | `#463b30` | body text on chips |
| ink-800 | `#2f2820` | **default body text** |
| ink-900 | `#1f1a15` | **headings / wordmark** |

### Severity — conflict-alert scale (warm-toned, still distinct)
| Severity | Hex | Meaning |
|---|---|---|
| contraindicated | `#a8321f` | most serious (deep red) |
| major | `#c0561f` | high (burnt orange-red) |
| moderate | `#c98a2b` | medium (amber) |
| minor | `#8a6f3c` | low (olive-brown) |

> Severity badges are pill-shaped, solid-fill with **white** text, uppercase, letter-spaced.

### Page background (the signature look — reuse this on the landing page)
A fixed, multi-layer warm gradient. Copy exactly:
```css
background:
  radial-gradient(1200px 600px at 12% -10%, rgba(189, 133, 83, 0.30), transparent 60%),
  radial-gradient(1000px 700px at 95% 0%,  rgba(207, 99, 38, 0.16), transparent 55%),
  radial-gradient(900px 900px at 50% 120%, rgba(212, 173, 132, 0.32), transparent 60%),
  linear-gradient(180deg, #faf6ef 0%, #f1e7d8 100%);
background-attachment: fixed;
```
Base surface colour for the body is `#faf6ef → #f1e7d8` (latte cream). Default text colour is `ink-800` (`#2f2820`).

---

## 3. Typography

Two families. **Serif for display/headlines + the wordmark**, **system sans for everything else.**

**Display (serif) — headings & wordmark:**
```
ui-serif, "New York", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif
```
Use for: hero headline, section titles, the Qiáo wordmark. Apply `font-weight: 700` + tight tracking
(`letter-spacing: -0.02em`).

**Sans (system) — body, UI, buttons, captions:**
```
-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif
```

**Type scale in use (Tailwind sizes):**
- Hero / page title: `text-4xl` (2.25rem) bold serif, `text-ink-900`
- Big section heading: `text-3xl` bold serif
- Card title: `text-sm` (0.875rem) `font-semibold`, `text-ink-800`
- Body: `text-sm`, `text-ink-800`
- Subtitle / caption: `text-xs` (0.75rem), `text-ink-400` or `text-ink-500`
- Micro / hints: `text-[11px]` / `text-[10px]`, `text-ink-400`
- Body is `antialiased`.

**The wordmark (use exactly this lockup):**
> **Qiáo** `·` **橋**

Rendered as: serif, bold, `text-ink-900`; the middle dot `·` and the accent are `text-brand-500` (`#a3673a`);
the Chinese character 橋 sits after the dot. Tagline sits under it in `text-sm text-ink-500`.

---

## 4. The "Liquid Glass" surface system (signature effect)

Every card/panel is a frosted translucent surface. Three primitives:

**`.glass`** (standard card):
```
background: rgba(253, 250, 244, 0.60);   /* #fdfaf4 @ 60% */
backdrop-filter: blur(24px);             /* Tailwind backdrop-blur-xl */
border: 1px solid rgba(255,255,255,0.55);
box-shadow: 0 8px 32px rgba(74,47,31,0.12), inset 0 1px 0 rgba(255,255,255,0.6);
border-radius: 2rem;                     /* rounded-3xl */
```

**`.glass-strong`** (hero / login card — more opaque, deeper blur):
```
background: rgba(253, 250, 244, 0.75);
backdrop-filter: blur(40px);             /* backdrop-blur-2xl */
border: 1px solid rgba(255,255,255,0.65);
box-shadow: 0 20px 60px rgba(74,47,31,0.18), inset 0 1px 0 rgba(255,255,255,0.65);
```

**`.glass-input`** (frosted form field):
```
background: rgba(253, 250, 244, 0.65);
backdrop-filter: blur(12px);             /* backdrop-blur-md */
border: 1px solid rgba(255,255,255,0.65);
border-radius: 1.5rem;                   /* rounded-2xl */
/* focus: */ ring: 2px rgba(212,173,132,0.70) (brand-300); border → brand-200
```

> Translucent white pills (`bg-white/60`–`/70` with `border-white/70-80`) are used for nav profile
> pills and item chips — same frosted family, smaller.

---

## 5. Shadows, radii, blur

**Brown-tinted shadows** (never grey/black — depth must stay warm):
| Name | Value |
|---|---|
| `shadow-soft` | `0 2px 12px rgba(74,47,31,0.10)` |
| `shadow-glass` | `0 8px 32px rgba(74,47,31,0.12), inset 0 1px 0 rgba(255,255,255,0.6)` |
| `shadow-glass-lg` | `0 20px 60px rgba(74,47,31,0.18), inset 0 1px 0 rgba(255,255,255,0.65)` |

**Border radius:** generous and rounded.
- `rounded-xl` = 1rem · `rounded-2xl` = 1.5rem · `rounded-3xl` = 2rem (cards) · `rounded-full` (pills, badges, bullets, avatars).

**Backdrop blur:** `xs`=2px, `md`=12px (inputs), `xl`=24px (cards), `2xl`=40px (strong cards).

---

## 6. Components — copy these patterns

**Primary button** (`brand-500`, rounded-2xl, semibold, soft shadow):
```html
class="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold
       bg-brand-500 text-white shadow-soft hover:bg-brand-600 transition-colors duration-200"
```
Disabled → `bg-ink-300`, no shadow. Motion: `whileHover={{ y: -1 }}`, `whileTap={{ scale: 0.97 }}` (spring).

**Secondary button:** `bg-white/70 text-ink-800 border border-white/80 backdrop-blur-md hover:bg-white/90`.
**Ghost button:** `text-ink-600 hover:bg-white/50`.

**Avatar / role chip:** circular (`rounded-full`), solid colour from the user's `avatarHex`, white bold initials.
Role badge colours: patient `bg-brand-100/text-brand-700`, caregiver `bg-teal-100/text-teal-700`,
practitioner `bg-ink-100/text-ink-600`.

**The standardized bullet:** every list indicator is the SAME colour — a 10px `rounded-full` dot in
`bg-brand-900` (`#4a2f1f`). (Deliberately uniform — no rainbow bullets.)

**Item chips (medications etc.):** `bg-white/70 border border-white/80 text-ink-700 text-xs font-medium
rounded-full px-3 py-1.5 shadow-soft`, with a small `×` remove icon in `text-ink-400`.

**Severity badge:** `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide`, solid severity
colour bg + white text.

**Sticky nav:** `.glass` bar, `border-b border-white/50`, height 64px (`h-16`), `max-w-5xl` centered.

---

## 7. Motion (Framer Motion — keep it quiet)

- **Entrance:** fade + small rise. `initial={{opacity:0, y:8–28}} animate={{opacity:1, y:0}}`, `duration 0.35–0.5s`, ease `[0.22, 1, 0.36, 1]` (custom ease-out). Stagger sections by `delay`.
- **Buttons/pills:** spring `{ stiffness: 400, damping: 25 }`, hover lifts `y: -1`, tap `scale: 0.97`.
- **Keyframe animations available:** `fade-up` (0.4s) and `float-slow` (gentle 14px vertical float, 12s loop — nice for a hero illustration).
- **Always respect `prefers-reduced-motion`** (the app nulls out animations/transitions when set).

---

## 8. Layout conventions

- Content max width: **`max-w-5xl`** (1024px), centered, horizontal padding `px-4 sm:px-6`.
- Generous vertical rhythm: sections `py-8`, gaps `gap-4`/`gap-6`, cards padded `p-5`–`p-8`.
- Mobile-first and fully responsive (the product is used on phones by elderly users + caretakers).
- Light mode only (`color-scheme: light`) — there is no dark theme.

---

## 9. Voice & content notes for the landing page

- **What Qiáo is:** a cloud reconciliation + **drug–herb conflict-detection** system that merges a patient's
  **Western Medicine (WM)** and **Traditional Chinese Medicine (TCM)** records into one view and flags
  dangerous interactions the two siloed systems miss. Elderly-care focus, Hong Kong.
- **What it is NOT:** not a chatbot, not a diagnostic AI, not a "copilot." Don't imply it gives medical advice.
- **Trust messaging:** every conflict flag is **explainable and sourced** (what / why / severity / source).
  The safety verdict is a **deterministic lookup**, not AI-generated — lean into "verified, sourced, transparent."
- **Hero proof point:** *warfarin (WM) + a danshen/dong-quai (TCM) formula → high-severity bleeding-risk alert.*
- **Bilingual:** the product is fully **English / 繁體中文** — the landing page can show both, and the
  wordmark always pairs the roman "Qiáo" with 橋.
- **Tone:** reassuring, premium, human, calm. Audience = caretakers, elderly patients, TCM practitioners.

---

## 10. Quick-reference cheat sheet

```
PRIMARY      brand-500  #a3673a   (buttons, links)
PRIMARY DARK brand-900  #4a2f1f   (bullets/indicators)
ACCENT       teal-500   #cf6326   (terracotta highlight)
TEXT         ink-800    #2f2820   (body)  /  ink-900 #1f1a15 (headings)
MUTED        ink-400    #a3917c   (captions/placeholder)
SURFACE      #fdfaf4 @ 60–75% + blur (glass cards)
PAGE BG      cream gradient #faf6ef → #f1e7d8 + warm radial washes
HEADINGS     serif (New York/Georgia), bold, tight tracking
BODY/UI      system sans (SF Pro / Segoe UI)
RADII        cards rounded-3xl (2rem); pills rounded-full
SHADOWS      warm brown-tinted (rgba(74,47,31,...))
MOTION       gentle fade+rise, spring buttons, respect reduced-motion
WORDMARK     Qiáo · 橋   (dot in brand-500)
```
