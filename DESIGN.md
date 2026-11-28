# Design system: Home Plans for Steel

> The single source of truth for how this website looks and reads. Everything built on the site follows this file.
> The tokens below are implemented in `design.css` (loaded last, so it wins).

## 1. Idea

**A drafting sheet that builds itself.** Precise like an engineer's drawing, calm like a quiet studio, plain-spoken like a good builder.

Three pillars:

1. **Precision.** Hairline rules, a faint grid, real dimensions on real plans. Nothing decorative that an engineer would not draw.
2. **Clarity.** One idea per screen. A headline, a sentence, one action. No eyebrow labels, no badges, no filler.
3. **Quiet motion.** Things draw, rise and settle. Nothing bounces, nothing flashes. Motion explains; it never shouts.

## 2. Colour

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0B2233` | Headlines, primary buttons, strong text |
| `--ink-2` | `#46515C` | Body text |
| `--mute` | `#5B6B78` | Captions, small data (5.5:1 on white) |
| `--paper` | `#FFFFFF` | Cards, inputs, panels |
| `--sheet` | `#FBFCFD` | Main page surface |
| `--canvas` | `#F4F6F8` | Page background behind sheets |
| `--rule` | `rgba(30,34,40,.14)` | Hairlines inside a sheet |
| `--rule-strong` | `rgba(30,34,40,.28)` | Sheet borders, control outlines |
| `--accent` | `#B3152B` | The one warm accent: key actions on hover, marks, selection |
| `--blue` | `#2E6A8E` | Information, links, focus ring |
| `--violet` | `#6D4CFF` | **Editor only**: selecting and changing a plan |
| `--ok` | `#1F9D62` | Confirmed / applied |
| `--black` | `#000000` | The footer, nothing else |

Rules: ink on paper is the default pairing. Use the accent sparingly (one accent moment per screen). Never use pure black for text. Violet never appears outside the Modify editor.

## 3. Typography (the rule book)

**Three families, three jobs. No others.**

| Role | Family | Weights | Used for |
|---|---|---|---|
| Display | **Inter Tight** | 600 | Headlines (h1, h2, h3), big numbers |
| Text | **Inter** | 400, 500, 600 | Body, buttons, forms, navigation |
| Data | **JetBrains Mono** | 400, 500 | Numbers on drawings, chart axes, dimensions, captions on figures |

Type scale (fluid, desktop to phone):

| Style | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| Display (hero h1) | `clamp(2.5rem, 6vw, 5rem)` | 1.02 | -0.04em | 600 |
| H2 (section) | `clamp(2rem, 3.8vw, 3.25rem)` | 1.06 | -0.035em | 600 |
| H3 (card, step) | `clamp(1.25rem, 1.7vw, 1.625rem)` | 1.18 | -0.02em | 600 |
| Lead | `clamp(1.0625rem, 1.3vw, 1.25rem)` | 1.5 | 0 | 400 |
| Body | `1rem` (16px) | 1.6 | 0 | 400 |
| Small | `0.875rem` (14px) | 1.5 | 0 | 400 |
| Control (buttons, chips) | `0.9375rem` (15px) | 1 | 0 | 500 |
| Data / caption | `0.75rem` (12px) | 1.4 | +0.06em | 400 to 500, mono |

Rules:

- **Sentence case everywhere.** Never ALL CAPS in headings, buttons or links. Uppercase is allowed only for mono data captions on drawings.
- **No eyebrows.** Do not put small labels above headings or cards (no "FIG. 01", "SECTION A", tag chips).
- Headlines use `text-wrap: balance`; paragraphs use `text-wrap: pretty`. Line length 45 to 66 characters.
- Only weights 400, 500, 600. No bold 700, no italics.
- Prices and numbers use tabular figures (`font-variant-numeric: tabular-nums`).
- Body text is `--ink-2`; headlines are `--ink`; captions are `--mute`.
- Links are Inter 500, sentence case, with an underline that draws in on hover. The arrow `->` is part of the label.

## 4. Space and layout

- **4px base unit.** Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Container: max 1380px, side gutter `clamp(20px, 4vw, 56px)`.
- Section rhythm: 64 to 112px top and bottom on desktop, 48 to 64px on phones.
- Grid: 12 columns desktop, 1 column phone. Cards sit on the grid; they never float.
- Breakpoints: **900px** (tablet: hamburger menu appears) and **760px** (phone: single column, centred text).
- Sticky top bar is 64px tall; anchors use `scroll-padding-top: 84px`.

## 5. Shape, surfaces and depth

**Sheets are square, tools are round.**

- **Sheets** (sections, cards, figures, tables): square corners, 1px `--rule` lines, 9 to 12px diamond corner marks where cells meet. They are the drawing.
- **Tools** (buttons, chips, inputs, menus): rounded. Buttons and chips are pills (`999px`); inputs and panels are `12px`; the editor window is `20px`.
- Elevation is rare and soft: `--sh-sm` for hover on cards, `--sh-md` for menus, `--sh-lg` for the editor window and sticky cards. No hard shadows, no glow except the white dot cloud in the footer.
- Borders carry the structure; shadows only confirm that something is lifted.

## 6. Components

**Top bar.** White, 64px, one hairline underneath. Logo centred, links left, Contact and **Request a custom plan** right. The request button is an ink pill, always visible and always sticky (on phones it sits beside the hamburger). Links get a 2px accent underline that draws in on hover; the current page is ink with the underline held.

**Buttons.** 44px minimum height, pill, Inter 500 at 15px.
- *Primary*: ink fill, white text. Hover: slightly lighter ink. One per screen section.
- *Secondary*: white fill, `--rule-strong` outline, ink text. Hover: ink outline.
- *Accent*: accent fill, white text. Only for the final commit of a task ("Send revisions").
- *On black* (footer): white fill, black text.
- Press: scale to 0.98 for 120ms. Focus: 2px `--blue` ring with 3px offset.

**Links with arrows** ("Browse plans ->"). Inter 500, ink, 1px underline that grows from the left on hover.

**Cards.** Square, white, 1px rule. Plan card: drawing on top (contained, never cropped), name and price on one line (price tabular), facts underneath. Hover changes the border to ink and adds `--sh-sm`. **Hover never moves a card's border or corner marks**; only the content inside may lift 6px.

**Feature cells.** Three across on desktop, stacked on phones. Icon (32px line art, 1.2px stroke) and one or two sentences. No titles.

**Chips.** 36px pill, Inter 500 at 13.5px, hairline outline. Selected state: ink fill.

**Inputs.** 12px radius, 1px `--rule-strong`, 48px tall, 15px text. Focus: blue ring.

**Modify editor.** A 20px window with the plan on the left and the change panel on the right. Selection is violet (`--violet`), applied changes are green (`--ok`), detected doors teal, windows green, walls amber. Every change gets a numbered marker.

**Footer.** Black. Heading, one sentence and one white pill at the top left; the plan (bottom left) turns into dots that stream to the 3D model (top right). Address, phone, email and links below in white. A faint outlined wordmark slides along the bottom.

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` | Entrances (expo-out feel) |
| `--ease-io` | `cubic-bezier(.65, 0, .35, 1)` | Drawing and wipes |
| `--t-fast` | 150ms | Hover, press |
| `--t-base` | 250ms | Colour, border, shadow |
| `--t-slow` | 600 to 1200ms | Entrances, reveals |

Rules: hide what will animate **before** first paint so nothing flashes in its finished state; honour `prefers-reduced-motion` (show the finished state, no movement); animate `transform` and `opacity` only; never shift layout; stagger groups by 60 to 120ms.

## 8. Imagery

Line drawings, blueprints with real dimensions, topographic contour lines as texture, and the white dot cloud on black. No stock photography, no gradients as decoration, no illustrations with faces. Plan drawings are always shown whole (object-fit: contain).

## 9. Accessibility

- Text contrast 4.5:1 minimum (ink on paper is about 15:1).
- Touch targets 44px minimum.
- A visible focus ring on everything focusable: 2px `--blue`, 3px offset.
- Everything works with the keyboard; the hamburger closes with Escape.
- Reduced motion is respected; the sketching mode on touch screens never traps scrolling.

## 10. Voice

Plain, short, concrete. Say what it is and what it costs. Sentence case. Numbers carry units.

- Yes: "Drag over the part you want different and watch it redraw."
- Yes: "No contractors in between."
- No: "Revolutionary AI-powered design experience."
- No: Title Case On Every Word, exclamation marks, filler.

## 11. Do and don't

| Do | Don't |
|---|---|
| One accent moment per screen | Sprinkle red everywhere |
| Square sheets, round tools | Round the sheets or square the buttons |
| Let hairlines do the structure | Boxes inside boxes with shadows |
| Hide-then-reveal animations | Show the final state, then animate |
| Centre text on phones, left-align on desktop where the layout is split | Mix alignments within one block |
| Reuse a token | Invent a new colour, size or radius |

## 12. Files

| File | Role |
|---|---|
| `DESIGN.md` | This document |
| `design.css` | The tokens and component rules above (loaded last) |
| `clean.css` | Hides eyebrow-style labels site-wide |
| `sections.css`, `footer.css`, `modify.css`, `hero.css` | Section-specific layout |
| `animations.js` | Entrance and scroll motion (GSAP) |
