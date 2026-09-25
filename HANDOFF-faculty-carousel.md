# Handoff — Faculty carousel on the homepage

**Status:** recon complete, no implementation started. Written 2026-09-25.

## Goal

Add 4 new faculty members to the homepage faculty section, displayed as a horizontal-scroll
strip with dot indicators, below the existing featured Dr. Shiva Sharma card.

## Locked decisions (user-confirmed)

1. **Headshots** — crop the portrait out of the 4 card screenshots (no original headshot files exist).
2. **Placement** — Dr. Shiva Sharma stays as the existing featured card; the 4 new faculty scroll horizontally below it with dots.
3. **Style** — dark, matching the existing dark-green faculty section (not the light cards in the screenshots).

## Where the homepage actually lives

`app/page.tsx` is a 11-line shell that iframes the real homepage:

```tsx
<iframe className="homepage__frame" src="/schoolai-homepage.html" title="AI 360° homepage" />
```

So **all homepage edits go in `public/schoolai-homepage.html`** — a 2.2 MB, 4614-line Pencil
export. Not a React component. `app/page.module.css` only sizes the iframe.

### Layout risks to plan for (important)

- Markup is Tailwind utility classes with **absolute pixel positioning**, e.g.
  `class="box-border w-[756px] h-[500px] absolute left-[556px] top-0 flex flex-col ..."`.
- Confirm whether Tailwind utilities are actually compiled into that file or loaded from a CDN
  before relying on arbitrary-value classes for new markup. **Safer:** write the carousel with a
  scoped plain-CSS `<style>` block + a small vanilla `<script>`, using its own class prefix
  (e.g. `.fac-carousel__*`) so it can't collide with the export's utilities.
- Because the section is absolutely positioned, inserting a new flow block may not push anything
  down. Either place the strip inside an existing flow container, or absolutely position it and
  **bump the parent's fixed height** to make room. Check this explicitly.

## Faculty section anchor

```
grep -n 'data-pencil-name="Dr Shiva Sharma"' public/schoolai-homepage.html   # ~line 3133
```

Related anchors in that section: `Dr Shiva Sharma Role`, `Dr Shiva Sharma Biography`,
`View Faculty Profile`, `Meet Your Instructor` (all `data-pencil-name` attributes).

Portraits in this export are **base64 `data:` URIs inside a `background-image`** on a `<div>` —
there is no `<img>`. New cards should use real `<img>` tags with a file path instead, so the
images stay cacheable and the file doesn't grow.

Note: the file's lines are enormous (500k+ tokens for a partial read). Do **not** `Read` it
directly — use `grep -n` for anchors and an offset/character-slice script to extract regions.

## The 4 records

Existing headshot file: `public/admin-assets/teachers/dr-shiva-sharma.png`

Target paths for the new crops:

| Person | Target file |
|---|---|
| Dr. Ruchir Saxena | `public/admin-assets/teachers/dr-ruchir-saxena.png` |
| Shubhangini Agarwal | `public/admin-assets/teachers/shubhangini-agarwal.png` |
| Kritika Dadhich | `public/admin-assets/teachers/kritika-dadhich.png` |
| Jitaksh Jain | `public/admin-assets/teachers/jitaksh-jain.png` |

### 1. Dr. Ruchir Saxena
- Role line: `PROFESSOR & HEAD · PODDAR MANAGEMENT & TECHNICAL CAMPUS`
- Bio: Recognized as an Innovation Ambassador by the Ministry of Education and AICTE. Holds a Ph.D. and is a published author on the societal impact of AI, including "Lawyerless Courtroom" and "Immersive Realms." With deep expertise in machine learning and computer vision, he helps participants move from basic theory into strategic, high-level AI integration.

### 2. Shubhangini Agarwal
- Role line: `ASSISTANT PROFESSOR · PODDAR INTERNATIONAL COLLEGE`
- Bio: Technologist with a Master of Computer Applications (MCA) and a strong foundation in programming, data analytics, and interactive development. Co-authored the chapter "Foundations of AI" in Immersive Realms: Exploring the Landscape of Artificial Intelligence. Her hands-on style breaks down complex technical ideas into accessible learning experiences for every level.

### 3. Kritika Dadhich
- Role line: `AI TRAINER`
- Bio: Helps students and professionals apply Generative AI, AI tools, and prompt engineering to real-world work. Combines experience across digital marketing, content, and business — including roles with Capri Global Capital Ltd. and GoMechanic — with certifications from Google Digital Garage, Google Analytics Academy, HubSpot Academy, and Accenture/FutureLearn.

### 4. Jitaksh Jain
- Role line: `AI TRAINER & CREATIVE STRATEGIST · FOUNDER, ESKEEWALKER STRATEGIES`
- Bio: Leads an AI-driven creative studio focused on Generative AI, visual storytelling, and content creation. Specializes in turning emerging AI capabilities into practical workflows for branding, communication, and creative production, combining strategic thinking with hands-on, real-world application.

## Source screenshots

Copied into `.faculty-source/` (scratch, not served; consider adding to `.gitignore`):

| File | Person | Size |
|---|---|---|
| `ruchir-saxena-card.png` | Dr. Ruchir Saxena | 676×512 |
| `shubhangini-agarwal-card.png` | Shubhangini Agarwal | 656×538 |
| `kritika-dadhich-card.png` | Kritika Dadhich | 670×524 |
| `jitaksh-jain-card.png` | Jitaksh Jain | 620×518 |
| `existing-section-reference.png` | existing dark section (Shiva Sharma) | 2000×899 |

These are **card screenshots** — the portrait is at top-centre, with the name, role line and bio
rendered as text below it. Only the portrait region should be cropped.

## Blocker: portrait bbox detection

`.faculty-source/detect-photo.js` is a pure-JS PNG decoder + bbox detector. It **decodes
correctly** (verified: 676×512, RGBA, white `255,255,255` background, skin-tone pixel at
`(width/2, 100)`), but the band scan returns nothing.

**Cause:** the row profile walks outward from its peak and stops at a genuinely empty row, but
near-white areas *inside* the portraits (e.g. Dr. Ruchir Saxena's white blazer) read as
background and break the run.

**Fixes to try, in order:**
1. **Fixed proportional crop** (fastest, then verify by eye). Measured from the previews, the
   portrait is consistent across all four:
   - x: `0.31–0.36 × width` → `0.62–0.66 × width`
   - y: `0.09–0.11 × height` → `0.58 × height`
   Crop to the portrait rect, then view the result to confirm.
2. **Smoothed profile** — score each row by `max(contentFraction)` over a ±25-row window before
   band detection, so interior white regions can't break the run.

**Cropping tool:** no ImageMagick and no PIL in this environment. `sips` (sips-316) does support
offsets:

```bash
sips -c <height> <width> --cropOffset <y> <x> input.png --out output.png
```

Verify the written file's dimensions afterwards — the `--cropOffset` argument order is worth
double-checking against actual output.

**Always view the cropped PNGs** before wiring them into the page. A wrong crop that still looks
plausible at thumbnail size is the likely failure mode.

## Suggested implementation

1. Crop the 4 portraits → `public/admin-assets/teachers/*.png`; view each to confirm.
2. In `public/schoolai-homepage.html`, find the faculty section via the anchor above.
3. Append, below the existing featured card, a self-contained block:
   - scoped `<style>` with `.fac-carousel` prefix (do not lean on the export's Tailwind),
   - `overflow-x: auto; scroll-snap-type: x mandatory` track, `scroll-snap-align: center` on cards,
   - one dot per card, active dot driven by a `scroll` listener (or `IntersectionObserver`) in a
     small `<script>`,
   - dots clickable → `scrollTo({ left, behavior: 'smooth' })`,
   - `prefers-reduced-motion` guard on smooth scrolling,
   - cards dark (`#102621`-family background, matching the existing section), portrait as
     `<img loading="lazy">` with `border-radius`, name in navy/white display type, role line in
     the teal accent, bio as body text.
4. Keyboard/AT: track gets `tabindex="0"` + `role="group"` + `aria-label`, dots are real
   `<button>`s with `aria-label="Show <name>"` and `aria-current` on the active one.
5. Mobile: card width via `clamp()`, so one card fills most of the viewport and neighbours peek.

## Verification

- Serve on the existing dev port (this project already runs on **:3001**; a stray unrelated app
  holds :3000). Do not start a second `next dev` — Next refuses and exits.
- Load `http://localhost:3001/` and confirm: dots match card count, clicking a dot scrolls to
  that card, dragging/scrolling updates the active dot, layout holds at ~390px and ~1440px,
  and the new strip doesn't overlap the featured card.
- Confirm the 4 portraits render (a broken `src` is the easy miss).
- Check the existing admin dashboard still looks right — `app/admin/admin.css` was edited this
  session (sidebar pinned, content scrolls) and is unrelated to this task.
