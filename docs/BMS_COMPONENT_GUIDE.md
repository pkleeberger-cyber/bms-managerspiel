# BMS Component Guide v1

This guide defines reusable BMS component patterns derived from the Figma source
in `/Users/patrickk/Downloads/Fussball Manager Design Vorschlag.zip`.

It complements `docs/BMS_DESIGN_SYSTEM.md`. Use it for future prompts,
implementation reviews and component decisions.

## Hero

Visual purpose: create immediate orientation around the primary object, result
or phase.

Observed Figma usage: dark navy gradient match and transfer headers with large
title/score, compact metadata and a visible state/action.

Behaviour:

- Shows the page object and current state.
- Contains one primary action when the hero is action-oriented.
- Uses strong typography only for score, competition, transfer phase or key
  object.

Spacing:

- Compact hero: 148-180px high.
- Inner padding: 24-32px.
- Use `gap-6` between title and status block.

Typography:

- Title/score: `Exo 2`, 44-72px, 800-900.
- Metadata: 10-12px uppercase, wide tracking.
- Body: 13-15px `Inter`.

Icons:

- Use small state/object icons only when they clarify context.
- Avoid decorative icon clusters.

States:

- Active/open: green accent chip.
- Result: win/loss badge and score.
- Disabled/no action: keep the hero informational, no fake action.

Responsive behaviour:

- Wrap status block under title on narrow screens.
- Keep score centered and manager names readable.

Usage examples:

- Match result.
- Transfer phase.
- Competition header.

## Compact Hero

Visual purpose: provide context without turning the screen into a dashboard.

Observed Figma usage: page title plus short subtitle and a small state chip.

Behaviour:

- One title, one context line, optional 1-3 metadata chips.
- No decorative image or unused side panel.

Spacing:

- 16-24px vertical rhythm.
- 24px max horizontal padding.

Typography:

- Title: `Exo 2`, 28-36px, 700-800.
- Context: 13-14px muted.

Icons:

- Optional icon for object type.

States:

- Use chip for official, open, final, active or pending.

Responsive behaviour:

- Chips wrap below title.

Usage examples:

- Office workspace header.
- Player master header.
- Season operations header.

## KPI

Visual purpose: make one important number scannable.

Observed Figma usage: header stat cards, squad status cards and transfer status
2x2 metrics.

Behaviour:

- Label, value, optional short subline.
- No paragraph.
- One metric per KPI.

Spacing:

- Compact: 12-16px padding.
- Standard: 16-20px padding.

Typography:

- Label: 10px uppercase, muted, bold.
- Value: `Exo 2`, 24-40px, 800-900.
- Subline: 10-12px muted.

Icons:

- Use only if it clarifies metric type or trend.

States:

- Positive/negative trend badges may sit beside value.
- Neutral values use muted styling.

Responsive behaviour:

- KPI grids wrap; cards must not clip values.

Usage examples:

- Budget.
- Squad value.
- Position.
- Points.
- Remaining transfers.

## Card

Visual purpose: group one coherent decision, story or data module.

Observed Figma usage: white `rounded-xl` cards with subtle border, optional
accent top border and compact internal divisions.

Behaviour:

- One responsibility per card.
- Actions belong in header or footer.
- Internal rows may use dividers.

Spacing:

- Standard card: `p-5`.
- Compact card: `p-4`.
- Header/footer rows: 16-20px horizontal padding.

Typography:

- Card label: 10px uppercase muted.
- Card title: `Exo 2`, 18-24px.
- Body: 12-14px.

Icons:

- Optional object/action icon.

States:

- Hover only when card is clickable.
- Accent border for selected/positive, red border for negative/attention.

Responsive behaviour:

- Cards wrap in grids; content must not overflow horizontally.

Usage examples:

- Budget & Teamwert.
- Transferstatus.
- Player highlight.
- Competition status.

## Comparison Card

Visual purpose: compare two values or sides quickly.

Observed Figma usage: match position comparison, manager-vs-manager rows and
home/away result bands.

Behaviour:

- Left entity, right entity, stable difference/winner indicator.
- Values are aligned symmetrically.
- The winning side receives soft emphasis.

Spacing:

- 16-20px padding.
- 8-16px between label and value.

Typography:

- Labels: 9-10px uppercase.
- Values: `Exo 2`, 24-32px.
- Difference: 12-14px bold chip.

Icons:

- Optional position/event icon.
- Trend arrow only for difference.

States:

- Positive: green soft fill.
- Negative: red soft fill.
- Draw/neutral: muted fill.

Responsive behaviour:

- Keep comparison horizontal where possible.
- Stack only when the viewport cannot preserve readable names.

Usage examples:

- Angriff/Mittelfeld/Abwehr/Torwart comparison.
- Old vs new transfer value.
- Manager A vs Manager B.

## Toolbar

Visual purpose: place controls directly above the data they affect.

Observed Figma usage: position filter pills plus search above evaluation tables.

Behaviour:

- Contains filters, search, select and optional primary action.
- Controls wrap.
- No unrelated page actions.

Spacing:

- 12-16px padding.
- 8px between controls.

Typography:

- Control text: 12-13px, medium.

Icons:

- Search icon optional.
- Chevron for selects.

States:

- Active filter uses accent/primary contrast.
- Disabled filters are muted and non-interactive.

Responsive behaviour:

- Search moves below filters on narrow screens.

Usage examples:

- Player table filters.
- Match evaluation position filters.
- Season import filters.

## Tabs

Visual purpose: switch between related views or modes.

Observed Figma usage: global nav and pill-like filter tabs.

Behaviour:

- Active item is visually clear.
- Tabs do not reload unrelated context.

Spacing:

- Horizontal nav: 20px x 14px approx.
- Compact tabs: 8-12px horizontal padding.

Typography:

- 12-14px, 600-700.

Icons:

- Global/local tabs may use icons.
- Filter tabs should stay text-only unless icon improves recognition.

States:

- Active underline or filled chip.
- Hover uses muted background.

Responsive behaviour:

- Allow horizontal scrolling or wrapping for many tabs.

Usage examples:

- Main navigation.
- Local office tabs.
- Position filters.

## Section Header

Visual purpose: structure long pages into readable chapters.

Observed Figma usage: numbered section labels like `01 Das Match`.

Behaviour:

- Short label.
- Optional small number chip.
- Does not compete with page title.

Spacing:

- 12-16px bottom margin before content.

Typography:

- 10-12px uppercase, bold, wide tracking.

Icons:

- Optional tiny indicator for competition sections.

States:

- Not interactive unless it controls collapse.

Responsive behaviour:

- Wrap labels; keep number chip fixed.

Usage examples:

- `Das Match`.
- `Kaderstatus`.
- `Ergebnisse Spieltag 1`.

## Badge

Visual purpose: communicate state, category, role or position.

Observed Figma usage: soft semantic chips for active, official, position,
status, top form and warning.

Behaviour:

- One concise label.
- Never carries long explanations.

Spacing:

- 6-10px horizontal padding.
- 2-4px vertical padding.

Typography:

- 9-12px, 700, often uppercase.

Icons:

- Optional tiny icon for event/status.

States:

- Green: success/active/official.
- Amber: pending/attention.
- Red: loss/invalid/negative.
- Blue/purple: category or position.
- Muted: neutral/inactive.

Responsive behaviour:

- Keep badges short; wrap groups, not individual badge text.

Usage examples:

- `Aktiv`.
- `Offiziell`.
- `TW`.
- `Topform`.

## Table

Visual purpose: scan and compare many rows.

Observed Figma usage: squad table, league table and full match evaluation.

Behaviour:

- Clear headers.
- Compact rows.
- Hover state for clickable rows.
- Expand detail only when needed.
- No raw IDs unless operationally necessary.

Spacing:

- Header: 12px vertical, 16-20px horizontal.
- Body row: 12-16px vertical.
- Dense mode: 8-12px vertical.

Typography:

- Headers: 10-12px uppercase muted.
- Cells: 12-14px.
- Primary names: `Exo 2` or bold `Inter`.
- Numeric stats: tabular/monospace where helpful.

Icons:

- Row avatar/crest optional.
- Trend sparkline allowed for performance data.

States:

- Hover: muted background.
- Selected/current manager: accent left border or accent-tinted row.
- Positive/negative cells use semantic text color.

Responsive behaviour:

- Tables may use horizontal scroll for true data grids.
- Preserve column labels; do not collapse into raw unstyled lists.

Usage examples:

- Player master overview.
- League table.
- Match slot comparison.

## Filter Bar

Visual purpose: narrow a list without leaving the screen.

Observed Figma usage: pill position filters and select/search combination.

Behaviour:

- Filters are visible before the list.
- Active filter is obvious.
- Counts may be added if useful.

Spacing:

- 8px control gaps.
- 12-16px section padding.

Typography:

- 12px, medium/bold.

Icons:

- Only for search/select or meaningful category.

States:

- Active, hover, disabled.

Responsive behaviour:

- Wrap to multiple lines.

Usage examples:

- Position filter.
- Status filter.
- Matchday select.

## Search

Visual purpose: find a player, manager or competition quickly.

Observed Figma usage: compact input aligned to the filter row.

Behaviour:

- Uses concise placeholder.
- Filters the current list.
- Does not navigate away.

Spacing:

- 12px horizontal padding.
- 6-8px vertical padding.

Typography:

- 12-13px.

Icons:

- Optional search icon inside input.

States:

- Focus border uses accent.
- Empty state below list if no match.

Responsive behaviour:

- Full width below filters on small screens.

Usage examples:

- Spielersuche.
- Manager search.

## Dialog

Visual purpose: confirm a focused action or edit a small field set.

Observed source basis: Radix dialog/alert-dialog components are included in the
Figma export as reusable primitives, even though the visible screens mostly use
inline actions.

Behaviour:

- Clear title, concise body, explicit actions.
- Dangerous actions require clear confirmation.
- Keep context visible where possible.

Spacing:

- 24px dialog padding.
- 16px field/action gaps.

Typography:

- Title: `Exo 2`, 20-24px.
- Body: 13-14px.

Icons:

- Warning/destructive icon only when state needs it.

States:

- Open, loading, disabled confirm, destructive confirm.

Responsive behaviour:

- Width constrained on desktop.
- Nearly full width on mobile.

Usage examples:

- Official close confirmation.
- Archive manager.
- Discard draft.

## Action Bar

Visual purpose: make next actions obvious.

Observed Figma usage: transfer draft card footer with primary and secondary
buttons; league hero with two actions.

Behaviour:

- One primary action.
- Secondary action is visually quieter.
- Destructive action separated or confirmed.

Spacing:

- 12px gaps.
- 12-16px button vertical rhythm.

Typography:

- 12-14px, bold.

Icons:

- Arrow for navigation/open.
- Check/send for submit only when meaningful.

States:

- Primary, secondary, disabled, loading.

Responsive behaviour:

- Two buttons can become stacked on narrow screens.

Usage examples:

- Open transfer workspace.
- Submit team.
- Open analysis.

## Timeline

Visual purpose: show chronological events.

Observed Figma usage: event/history rows with date blocks and compact labels.

Behaviour:

- Newest first for history; chronological for upcoming events.
- Each item has date, title and type/status.

Spacing:

- 16px row padding.
- 12-16px gap between date marker and content.

Typography:

- Date marker: bold compact.
- Title: 14px medium.
- Type: badge.

Icons:

- Calendar/event icon optional.

States:

- Past, current, upcoming, archived.

Responsive behaviour:

- Date block stays fixed width; content wraps.

Usage examples:

- Season history.
- Import history.
- Matchday events.

## Accordion

Visual purpose: hide secondary or technical detail.

Observed source basis: accordion/collapsible primitives are included; full
evaluation rows expand details on demand.

Behaviour:

- Closed by default when content is secondary.
- Open state should preserve table/list context.

Spacing:

- Trigger row matches the parent table/card row.
- Detail area uses 16-24px padding.

Typography:

- Trigger label: 13-14px bold.
- Detail labels: 10-12px uppercase.

Icons:

- Chevron to indicate expand/collapse.

States:

- Closed, open, disabled.

Responsive behaviour:

- Detail grids may stack on mobile.

Usage examples:

- Debug section.
- Raw calculation details.
- History item details.

## Empty State

Visual purpose: explain why a list or module has no content.

Observed Figma usage: competition screen shows `Noch keine Berechnung` inside a
white card.

Behaviour:

- Short heading.
- One explanatory sentence.
- Optional action if the user can resolve it.

Spacing:

- 32-40px padding.

Typography:

- Heading: `Exo 2`, 18-22px.
- Body: 13-14px muted.

Icons:

- Optional subtle icon; no giant illustration.

States:

- Empty, filtered-empty, not-yet-available.

Responsive behaviour:

- Keep width readable; do not stretch text across full page.

Usage examples:

- No calculation yet.
- No draft changes.
- No search results.

## Player Row

Visual purpose: show player identity and performance in a compact sports-readable
row.

Observed Figma usage: squad table rows, transfer outgoing-player rows and match
evaluation rows.

Behaviour:

- Name and club/team are grouped.
- Position/status badges are compact.
- Performance values align in columns.
- Row can expand for detail only when needed.

Spacing:

- 12-16px vertical row padding.
- 8-12px avatar-to-text gap.

Typography:

- Name: 13-14px bold, often `Exo 2`.
- Club/subtext: 10-12px muted.
- Stats: 12px, tabular where useful.

Icons:

- Avatar initials or crest.
- Event icons only for actual events.

States:

- Hover for clickable rows.
- Positive/negative point values color-coded.
- Missing/neutral values use dash or muted text.

Responsive behaviour:

- Preserve key columns first: player, position, points/state.
- Allow horizontal scroll for full stat tables.

Usage examples:

- Squad roster.
- Match team comparison.
- Transfer affected player.

## Manager Row

Visual purpose: compare or list managers compactly.

Observed Figma usage: league result rows and table rows with initials/avatar,
manager name, score and official badge.

Behaviour:

- Left manager, centered score, right manager for matchups.
- Table rows for standings.
- Current manager may be accent-highlighted.

Spacing:

- 14-16px row padding.
- 10-12px avatar-to-name gap.

Typography:

- Manager: 13-14px bold.
- Score: `Exo 2`, 24px+ in result rows.
- Metadata: 10px muted.

Icons:

- Initial avatar or crest.
- Trophy/status icon only if useful.

States:

- Win/loss/draw color states.
- Official badge.
- Current user highlight.

Responsive behaviour:

- Keep score centered; names truncate safely.

Usage examples:

- Competition result list.
- Manager standings.
- Match header.

## Competition Card

Visual purpose: introduce a competition or summarize its current state.

Observed Figma usage: competition header/card with title, matchday, action
buttons and a supporting white object panel.

Behaviour:

- Shows competition name, matchday/status and next action.
- Uses a compact story block, not a giant decorative hero.

Spacing:

- 24-32px padding.
- 16-24px between title and actions.

Typography:

- Competition name: `Exo 2`, 36-52px when page-leading.
- Status/context: 10-14px.

Icons:

- Trophy/shield/object icon.

States:

- Open, official, no calculation, in progress.

Responsive behaviour:

- Stack secondary object panel below title on narrow screens.

Usage examples:

- Erste Liga.
- Pokal.
- Europapokal.
