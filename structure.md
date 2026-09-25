# AI 360° Workshop — Website Structure

Education brand. Practical AI workshops for schools, colleges, educators, researchers.
Goal: convert traffic → workshop enquiries.

---

## 1. Sitemap / IA

```
/                          Homepage
/programs/basic            Everyday AI
/programs/intermediate     AI Workflows
/programs/expert           Academic Research
/for-institutions          How to arrange (can also be a home section)
/faq                       Full FAQ
/contact                   Enquiry form
(footer)                   Privacy · Responsible AI · [social placeholders]
```

Every page routes to one primary CTA — **"Book a Workshop"**.

---

## 2. Homepage — Section by Section

### 2.1 Sticky Header
- Logo: "AI 360° Workshop" (wordmark + small node glyph).
- Nav: Programs (dropdown → 3 levels) · For Institutions · FAQ · Contact.
- CTA button right: **"Book a Workshop"** (primary, always visible).
- Mobile: hamburger → full-screen menu, same CTA pinned.

### 2.2 Hero
- Eyebrow: `Hands-on AI workshops for education`
- H1: `Practical AI skills for your school, college, or research team.`
- Sub: `AI 360° Workshop teaches the tools people actually use — from a student's first ChatGPT prompt to a researcher's literature review. Learn by doing, with responsible AI use built in.`
- CTA primary **"Book a Workshop"** + secondary **"Compare programs"** (scrolls to #programs).
- Visual: subtle animated node-graph / gradient mesh, low opacity. Static fallback.

### 2.3 Who We Serve (short)
| Audience | Line |
|---|---|
| Schools | Age-appropriate AI literacy for students and staff |
| Colleges | Practical AI skills for coursework and careers |
| Educators | Tools to teach, plan, and save time |
| Researchers | AI for literature review and analysis |

### 2.4 The Three Programs (core conversion block)
Three equal-height cards, color-coded per level:

| Level | Tools | Audience | Focus |
|---|---|---|---|
| **Basic — Everyday AI** | ChatGPT · Claude · Gemini | Schools & colleges | Learn, brainstorm, write, responsible AI use |
| **Intermediate — AI Workflows** | n8n · NotebookLM · Google AI Studio | College students & educators | Research, productivity, content, first automations |
| **Expert — Academic Research** | Bibliometrix · Rayyan · Zotero | Researchers, faculty, advanced students | Literature reviews, research analysis, reference management |

Each card: level, one-liner, tool chips, audience line, `Explore →`, `Enquire` button.

Comparison table below cards:

| | Basic | Intermediate | Expert |
|---|---|---|---|
| Who it's for | Schools, colleges | College, educators | Researchers, faculty |
| Tools | ChatGPT, Claude, Gemini | n8n, NotebookLM, AI Studio | Bibliometrix, Rayyan, Zotero |
| Focus | Everyday use | Workflows & automation | Academic research |
| Prereqs | None | Basic tool comfort | Research experience |
| Duration | [placeholder] | [placeholder] | [placeholder] |

### 2.5 Hands-On Learning Benefits
Six items (icon + one line):
- Learn by doing, not slides
- Real tools, real tasks
- Takeaway templates & workflows
- Responsible AI + academic integrity built in
- Content adapted to age and role
- [Duration/format placeholder]

### 2.6 How to Arrange a Workshop
Four steps:
1. **Enquire** — tell us your audience, location, numbers.
2. **We tailor** — pick a level, adapt the content.
3. **We deliver** — on-site or online, at your schedule.
4. **Follow up** — resources and support after.

### 2.7 FAQ Preview (3 questions + "View all")
- Who can attend a workshop?
- Are workshops online or in person?
- Do participants need their own AI accounts? *(privacy note: no shared personal data; tools used responsibly)*

### 2.8 Final CTA
- H2: `Bring practical AI to your institution.`
- One-line sub.
- Primary **"Book a Workshop"** button.

### 2.9 Footer
Programs · For Institutions · FAQ · Contact · Responsible AI + Privacy links · `[social / legal placeholders]`.

---

## 3. Workshop Page Template (× 3)

Each `/programs/*` page:

1. **Breadcrumb** — Home → Programs → Level.
2. **Hero** — level name, one-liner, audience tags, `Enquire about this workshop` CTA.
3. **Meta grid** (4 cells) — Audience · Prerequisites · Suggested duration · Delivery (on-site/online).
4. **What you'll learn** — 5–6 outcome bullets.
5. **Topics covered** — grouped list of modules.
6. **Practical activities** — 4–6 hands-on tasks.
7. **Tools** — text badges (no fake logos).
8. **Compare levels** — strip linking to the other two.
9. **Level-specific FAQ** — 2–3 questions.
10. **Enquiry CTA + form**.

Copy example (Basic):

> **Everyday AI** — ChatGPT, Claude, and Gemini for learning, brainstorming, and writing. Content adapted to school and college audiences, with responsible use throughout.

---

## 4. Contact / Enquiry Form

| Field | Type | Notes |
|---|---|---|
| Institution name | text | required |
| Contact person | text | required |
| Email | email | required, validated |
| Phone | tel | optional |
| City | text | required |
| Audience type | select | School / College / Educators / Researchers / Other |
| Estimated participant count | number or select | ranges |
| Preferred workshop level | select | Basic / Intermediate / Expert / Not sure |
| Message | textarea | optional |

States:
- **Loading** — submit button → spinner, disabled, `aria-busy`.
- **Success** — inline banner "Thanks — we'll reply within [placeholder]." Form resets.
- **Error** — inline field errors + summary (`aria-live`), focus moves to first error, values preserved, retry.

---

## 5. Design System

- **Type** — Headings: `Fraunces` (serif, editorial, credible) or `Sora`. Body: `Inter`. 2 families max.
- **Color** — calm academic, not AI-startup neon. Primary indigo/navy `#1E2A5A`; CTA amber `#F59E0B`; background warm off-white `#FAFAF7`; ink `#1A1A1A`. Level colors: Basic teal, Intermediate indigo, Expert plum.
- **Spacing** — 8px scale; generous section padding via `clamp()`.
- **Graphics** — dot grids, gradient blobs, node/connection lines (network = "360°"). Subtle. No cheesy robots.
- **Motion** — card hover-lift, button micro-interaction, `prefers-reduced-motion` respected.

---

## 6. SEO / A11y / Perf

- **SEO** — per-page title/meta; JSON-LD (`Course`, `EducationalOrganization`, `FAQPage`); semantic headings; sitemap; canonical.
- **A11y** — skip link, `:focus-visible`, contrast AA+, keyboard nav for dropdown/tabs, form labels + `aria-describedby`, error association.
- **Perf** — static/SSG, lazy images, font subsetting, minimal JS. Lighthouse 90+.

---

## 7. Stack

- **Astro + Tailwind CSS**, static output. Dev-edits via Git, redeploy on push.
- **Supabase** — `enquiries` table + email alert on insert (RLS on).
- Host: Vercel / Netlify / Cloudflare Pages.

Tradeoffs:
| Option | Gain | Give up |
|---|---|---|
| **Astro + Tailwind** (rec) | Fast, SEO, cheap, simple | No app features later |
| Next.js | App features (portal/auth) later | Heavier, more JS |
| WordPress | Non-technical self-edit | Slower, bloat, less control |

---

## 8. Repo Structure (proposed)

```
/
├─ src/
│  ├─ layouts/Base.astro        # header + footer + SEO + skip link
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ programs/basic.astro
│  │  ├─ programs/intermediate.astro
│  │  ├─ programs/expert.astro
│  │  ├─ for-institutions.astro
│  │  ├─ faq.astro
│  │  └─ contact.astro
│  ├─ components/               # Hero, ProgramCard, CompareTable, FaqAccordion, EnquiryForm, states
│  ├─ data/programs.ts          # single source of truth for 3 levels (topics, outcomes, FAQ)
│  └─ styles/                   # tokens + Tailwind config
├─ supabase/                    # migration: enquiries table, RLS, trigger → email
└─ public/                      # og image, favicon, fonts
```

Single `programs.ts` data file drives all 3 pages + home cards + comparison table — one edit updates everywhere.

---

## 9. Next Actions

1. Lock copy + set up Supabase `enquiries` table.
2. Design tokens + header/footer shell.
3. Home page sections.
4. Workshop template × 3.
5. Form + success/error states.
6. SEO/schema, a11y + perf audit, deploy.

## 10. Validation

Lighthouse 90+, axe clean, form submit success/error fire, mobile + reduced-motion correct.
