# BMS Design System v1

This document is the official BMS design authority.

Source of truth: `/Users/patrickk/Downloads/Fussball Manager Design Vorschlag.zip`.
The ZIP contains the Figma code export, style tokens, component scaffolding,
PDF exports and PNG screen exports. The rules below are derived from that
source, not from the current BMS implementation.

Future BMS screens must extend this language. Do not invent a separate layout,
card style, spacing rhythm or visual tone inside a feature sprint.

## 1. Figma Analysis

### Repeated Layout Patterns

The Figma source uses a stable application shell:

- dark navy global header
- horizontal main navigation below the header
- light grey workspace background
- fixed left subnavigation card where a section needs local navigation
- centered working canvas with generous but controlled side margins
- content arranged in numbered sections

Why it works: the dark top area creates a football-club identity, while the
light workspace keeps dense data readable. The left subnav gives orientation
without competing with the work surface.

Future BMS pages should keep this shell pattern unless the page is a focused
modal/workspace that deliberately removes navigation.

### Repeated Spacing

The export repeatedly uses:

- `px-6` page gutters
- `py-4` to `py-5` compact card rows
- `p-5` standard cards
- `p-7` for emotional hero content
- `gap-3`, `gap-4`, `gap-5`, `gap-6` for card and section rhythm
- `space-y-5` to `space-y-8` between major sections

Why it works: spacing is compact enough for tables and operational screens, but
larger hero sections still feel premium.

Future pages should use the same 4/8-based rhythm and reserve 48+ spacing for
page-level separation only.

### Repeated Typography

The source uses:

- `Exo 2` for headings, scores, KPI values and strong football labels
- `Inter` for body text and interface copy
- `DM Mono`/monospace for slot numbers, compact labels and precise stats
- uppercase 9-12px labels with wide tracking for section metadata
- very large score typography in match/result contexts

Why it works: `Exo 2` gives the product a sport/tech character without becoming
childish. `Inter` keeps operational data calm and readable. Monospace creates
statistical precision.

Future pages should keep this split: expressive display numbers in `Exo 2`,
readable work text in `Inter`, technical/scoring identifiers in monospace only
when they help scanning.

### Repeated Card Hierarchy

The export uses three card levels:

- hero/result cards: dark gradient, high contrast, strong score/title
- standard cards: white surface, `rounded-xl`, subtle border, restrained shadow
- dense row cards: white or muted surface, border, compact padding, hover state

Why it works: cards do not all compete for attention. The page has a clear
primary story, then supporting modules, then dense lists.

Future pages should choose the smallest card level that communicates the job.
Do not turn every list item into a large card.

### Repeated Navigation Patterns

The source uses:

- global tabs for main product areas
- left local nav for subareas like `Uebersicht`, `Kader`, `Transfers`,
  `Spiele`, `Historie`
- pill tabs for filters such as position filters
- action buttons inside the relevant card rather than in distant toolbars

Why it works: global orientation, local task selection and row-level actions are
separated.

Future pages should preserve this hierarchy: global navigation at top, local
navigation on the left or as compact tabs, contextual actions near the data.

### Repeated Icon Usage

The export uses lucide icons for navigation and actions:

- shield, trophy, news, message, settings
- calendar, map pin, bell, chevrons, arrows, trend arrows
- stars and football/event symbols in match/player moments

Icons are small, paired with labels, and used to clarify meaning.

Why it works: icons support scanning without becoming decoration.

Future pages should use icons only when they communicate state, object type or
action. Do not add icons merely to fill space.

### Repeated Color Usage

The source color language is:

- navy identity: `#0a1628`, `#0f1e35`, `#162640`
- green accent: `#16a34a` / `#22c55e`
- light workspace background: `#edf1f7`
- white cards: `#ffffff`
- muted slate text: `#64748b`, `#94a3b8`
- soft semantic fills: green/red/amber/blue/purple at low saturation
- subtle borders: dark at 12% or white at 8-15%

Why it works: navy and green make the product football-oriented; muted surfaces
avoid harsh enterprise UI; semantic colors remain readable without shouting.

Future pages should use soft semantic backgrounds and avoid saturated full-card
warning/error blocks unless the whole screen state is critical.

### Repeated Data Patterns

The export alternates between story cards and dense tables:

- match overview uses large result and explanation cards
- full match evaluation uses compact comparison rows and expandable detail
- squad uses KPI cards first, then a dense player table
- league uses result rows and a table
- transfer uses two-column operational cards

Why it works: emotional screens start with story, but detailed work remains
tabular and scannable.

Future pages should choose the data shape by user job: story first for manager
understanding, table/list first for maintenance and operations.

## 2. Design Philosophy

BMS should feel:

- modern
- fresh
- light
- playful
- professional
- football-oriented

BMS must never feel:

- childish
- ERP-like
- dashboard-heavy
- like a developer console
- like raw database output

What Figma does: it combines a strong club-like navy header, green accent,
sporty display typography, compact cards and dense tables.

Why it works: the product feels like a football manager application rather than
a generic admin tool. It has emotion where results matter and efficiency where
work must be completed.

How BMS continues it: every page should answer a football or operations question
directly. Data must be shaped into score, comparison, status or action.

## 3. UI Languages

The Figma source naturally contains two related languages.

### BMS Game

Observed in Figma:

- match result hero with large score
- team-vs-team comparison
- position comparison cards
- top player cards
- season trend charts
- league result rows
- story-oriented labels like `Das Match`, `Positiver Impuls`,
  `Wie wurde das Match entschieden?`

Design rule: Game screens are emotional, comparison-driven and player-focused.

Use for:

- manager home
- match analysis
- squad story
- competitions
- history and statistics

Continue the language with:

- clear winner/result presentation
- direct manager/player comparison
- large numbers only for outcome or key performance
- compact explanatory story modules
- charts only when they show trend or consequence

Do not use:

- raw scoring dumps as default view
- long developer explanations
- large blank hero areas without result or action

### BMS Office

Observed in Figma:

- transfer page uses a work banner, two-column status cards, validation rows,
  compact action buttons and player rows
- full evaluation uses filters, search, dense comparison rows and expandable
  detail
- tables and compact status rows are accepted where scanning matters

Design rule: Office screens are compact, efficient and task-oriented.

Use for:

- admin maintenance
- transfer operations
- player master
- season operations
- review workflows

Continue the language with:

- tabs or local navigation for work areas
- dense lists and tables
- one primary action per card or section
- status chips and validation rows
- progressive disclosure for detail

Do not use:

- executive-dashboard hero blocks
- 18 large cards where a list scans better
- decorative right sidebars without action
- raw debug data outside collapsed detail

## 4. Visual Principles

### Hierarchy

What Figma does: every screen starts with the object and state: manager status,
match result, transfer phase or competition.

Why it works: the user knows what they are looking at before reading detail.

Rule: first viewport must answer the page question and expose the next action.

### Whitespace

What Figma does: whitespace separates sections, but card internals stay compact.

Why it works: the page feels premium without sacrificing scan speed.

Rule: use whitespace for grouping and eye guidance, not for decoration.

### Symmetry

What Figma does: match and competition views align teams left/right with score
or difference centered.

Why it works: comparison becomes instant.

Rule: when two managers, players or values are compared, mirror the layout and
place the difference on a stable center or right-aligned axis.

### Alignment

What Figma does: labels, numeric values and tables are strongly aligned.

Why it works: dense football stats remain readable.

Rule: numbers align visually; action buttons align to the card edge; labels stay
above the value they describe.

### Visual Rhythm

What Figma does: sections use numbered labels, then cards/tables below.

Why it works: long pages become readable as chapters.

Rule: use section labels for story/analysis pages and compact section headers
for operations pages.

### Information Density

What Figma does: story surfaces are spacious; maintenance surfaces are dense.

Why it works: users get emotion first and precision when they need it.

Rule: do not force one density across the whole product. Match the density to
the job.

### Eye Guidance

What Figma does: dark/green blocks pull attention to the primary result or
action; muted text recedes.

Why it works: users do not have to search for the important state.

Rule: use accent color for active, positive or primary states; use muted text for
secondary context.

## 5. Spacing System

Use a 4px base grid.

- 4: micro gaps inside badges, icon-label spacing, table sublabels
- 8: compact row padding, badge padding, small control gaps
- 16: card internal grouping, filter bars, tight grids
- 24: standard card padding, page gutters, major card gaps
- 32: section separation, hero inner grouping
- 48: large hero separation, major page regions
- 64: only for top-level breathing room on wide Game pages

Figma evidence: `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-6`, `p-4`,
`p-5`, `p-7`, `px-6`, and section `space-y-5` to `space-y-8` recur across the
export.

Implementation rule: if a screen feels crowded, first improve grouping and
alignment. Do not jump to oversized whitespace.

## 6. Typography

### Page Title

- Font: `Exo 2`
- Size: 30-52px depending on context
- Weight: 700-900
- Use for page object, competition name, transfer phase, match result title

### Section Title

- Font: `Exo 2` or uppercase `Inter`
- Size: 10-20px
- Weight: 700
- Often uppercase with tracking for labels

### Card Title

- Font: `Exo 2`
- Size: 16-24px
- Weight: 700-900

### Body

- Font: `Inter`
- Size: 13-15px
- Weight: 400-500
- Color: foreground or muted foreground

### Table

- Font: `Inter`
- Size: 12-14px
- Headers: 10-12px uppercase
- Numeric values may use tabular/monospace styling

### Caption

- Font: `Inter`
- Size: 9-12px
- Uppercase for metadata; normal case for helper text

### Badge

- Font: `Inter` or `Exo 2` when paired with sport labels
- Size: 9-12px
- Weight: 700
- Uppercase when the badge is status-like

## 7. Color Language

### Primary

- Navy: `#0f1e35`
- Use for identity, main buttons, dark heroes and selected sidebar items.

### Secondary

- Deep blue: `#1a3050`, `#162640`
- Use for navigation bars, gradients and supporting dark panels.

### Accent

- Football green: `#16a34a`, `#22c55e`
- Use for active nav, positive state, primary highlight and progress.

### Surface

- Card: `#ffffff`
- Muted surface: `#dde4ee`, `#f0f4f9`, low-opacity muted fills
- Use white cards on light workspace.

### Background

- Light workspace: `#edf1f7`
- Dark identity areas: `#0a1628` to `#162640` gradients

### Success

- Soft green fill with green text
- Use for win, valid, completed, positive difference.

### Warning

- Soft amber fill with amber text
- Use for pending, attention, open warning.

### Danger

- Soft red fill with red text
- Use for loss, invalid, negative difference, destructive warning.

### Neutral

- Slate text and muted fill
- Use for secondary metadata, empty values, inactive states.

Rule: avoid harsh full-saturation backgrounds. Most semantic color appears as
soft fill plus strong text.

## 8. Icon Language

What Figma does: icons are functional. They label navigation, status, trend,
match event, action or object type.

Use icons to communicate:

- Goal: football symbol or score context
- Goalkeeper: glove or position chip when available
- Defence: shield
- MVP/top: star
- Budget: currency context, not decorative money icon unless space allows
- Competition: trophy
- Matchday: calendar
- Invalid team: blocked/stop symbol
- Warning: warning triangle or amber dot
- Navigation: chevrons/arrows
- Trend: up/down arrows

Rules:

- Pair icons with labels unless the symbol is universally understood in context.
- Keep icon sizes compact: 12-16px for UI, 20-28px for feature cards.
- Do not add icons as ornament.
- Prefer lucide icons where a matching icon exists.

## 9. Component Catalog

### Hero

Purpose: establish object, result or active phase.

Use when the page needs emotional or operational orientation.

Do not use for decorative marketing space.

Spacing: `p-7`, dark gradient, stable height around 148-180px for compact
heroes; larger only for match result.

Behaviour: includes primary status/action in the hero if the state requires it.

### Compact Hero

Purpose: identify page without stealing workspace.

Use for Office pages and dense workspaces.

Do not use huge typography unless the object is a match result.

Spacing: 16-24px padding, short metadata chips.

### KPI

Purpose: expose one number.

Use in small grids or header stat groups.

Do not use for paragraphs or multi-step explanations.

Spacing: 12-20px internal padding.

### Card

Purpose: group one decision, status or story.

Use standard `rounded-xl`, border, white surface.

Do not nest cards unless the inner element is a true row/control group.

Spacing: `p-5` standard, `p-4` compact.

### Toolbar

Purpose: collect filters, search and primary controls.

Use above tables and comparison lists.

Do not scatter filter controls into unrelated cards.

Spacing: compact, wraps on small widths.

### Tabs

Purpose: switch work modes or filters.

Use for local sections and simple data filters.

Do not use tabs for unrelated product areas already covered by nav.

Behaviour: active tab uses accent/primary contrast.

### Table

Purpose: scan many rows.

Use for squad, league, player master, history and comparison detail.

Do not replace dense maintenance data with large cards.

Spacing: 12-16px row height/padding, uppercase headers.

### Sidebar

Purpose: local navigation.

Use as fixed left subnav card.

Do not use right sidebars unless they provide immediate action or persistent
context.

### Action Bar

Purpose: expose current primary/secondary actions.

Use inside the relevant card or sticky footer in a focused workflow.

Do not hide primary actions after long scrolling.

### Timeline

Purpose: chronological history.

Use for events, history and released changes.

Do not use for unordered status lists.

### Badge

Purpose: show state, category or position.

Use soft semantic fills and concise labels.

Do not show badges for empty/irrelevant facts.

### Status Chip

Purpose: compact operational state.

Use for active, official, open, completed, pending, warning.

Do not mix status and action in the same chip.

### Filter Bar

Purpose: reduce table/list scope.

Use pill filters and search.

Do not make filters visually heavier than the result list.

### Search

Purpose: find a named object in a dense list.

Use compact input with clear placeholder.

Do not use search as a substitute for necessary filters.

### Dialog

Purpose: confirm or edit focused information.

Use for destructive confirmations or small forms.

Do not use dialogs for long workflows that need page context.

### Forms

Purpose: capture or edit data.

Use compact labels, grouped fields and clear action row.

Do not show long raw forms; split into sections or side panels.

### Empty State

Purpose: explain an absent result.

Use a concise heading, one sentence and optional action.

Do not use giant empty illustrations.

### Accordion

Purpose: hide secondary detail.

Use for debug, raw data and expanded calculation detail.

Do not hide primary decisions.

## 10. Office Rules

Office is a workspace, not a dashboard.

Rules derived from the Figma transfer and evaluation screens:

- Keep pages compact.
- Put current task/state near the top.
- Use dense tables where scanning is the goal.
- Use cards for grouped decisions, not every row.
- Use one primary action per section/card.
- Use status rows for validation.
- Collapse secondary details.
- Avoid decorative right sidebars.
- Avoid raw debug output.
- Avoid long vertical forms.

## 11. Game Rules

Game is emotional and explanatory.

Rules derived from the Figma match, squad and competition screens:

- Start with the result, opponent or competition.
- Use large numbers for score and decisive KPI.
- Use comparison layouts for teams and positions.
- Use player highlights sparingly.
- Put dense detail below story sections.
- Use charts only for meaningful trends.
- Use sport language, not internal labels.
- Keep debug/raw calculation collapsed.

## 12. UX Rules

- Every page answers one question.
- The first viewport exposes status and next action.
- Primary information is visible; secondary information is collapsed or moved
  below.
- Prefer progressive disclosure over long pages.
- Use user-facing football language.
- Never expose camelCase, raw JSON, database ids or engine field names in
  manager-facing UI.
- Tables are allowed and expected for dense work.
- Large cards are reserved for story, result, comparison or decisive action.

## 13. Implementation Rules

- Every future Codex prompt that touches UI must reference this design system.
- Future pages must extend the analysed Figma language instead of inventing new
  layouts.
- Use `docs/BMS_COMPONENT_GUIDE.md` for reusable component behaviour.
- Do not introduce new card styles, spacing scales or color systems without
  first updating this document.
- Do not derive design rules from accidental current implementation drift.
- If the Figma source does not define a pattern, evolve from the closest
  existing Figma pattern and document the extension.
- Code, CSS and business logic are outside the scope of this document.
