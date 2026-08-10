# Guided Transfer Workflow

## Purpose

The transfer workspace guides managers through one decision at a time. It is an
editing surface for a transfer draft, not a final submission or validation
screen.

## Why the three-column layout was abandoned

The previous workspace showed the current squad, the complete transfer market
and the future squad at the same time. Although comprehensive, this forced the
manager to scan too many players, controls and status values before making a
single decision.

The guided workflow replaces that permanent data density with contextual
disclosure. Each screen contains only the information required for the current
step.

## Workflow

1. Choose a mandatory or free transfer.
2. Select the outgoing player.
3. Review position-filtered replacement candidates.
4. Select and confirm a replacement.
5. Review the draft change or undo it.

Mandatory transfers begin with players who must be replaced. Free transfers
begin with the manager's current squad. The current squad is loaded from the
selected `managerSeasonId` through `TeamService`, so the sold-player options and
squad preview match `Mein Team -> Kader`. Both paths use the same focused
replacement and review steps.

Replacement candidates come from `PlayerService.loadTransferMarket()`, which
uses the active applied Player Master version for the selected season and
transfer phase. `LEFT_BUNDESLIGA` players are hidden unless developer mode is
explicitly enabled.

If no live mandatory-transfer source or active Player Master version exists, the
workflow shows an unavailable-source state instead of rendering placeholder
players.

## Transferplan statt 1:1-Tausch

Transfers are not completed as isolated one-for-one swaps. A manager builds one
transfer plan containing all intended sales and purchases. This allows several
movements to work together, for example financing one expensive player through
multiple sales and balancing the squad with a lower-cost addition.

The guided workflow still focuses on one decision at a time, but every confirmed
decision is added to the shared plan. The plan continuously shows:

- planned sales and purchases
- cumulative budget effect
- used and remaining transfers
- mandatory transfer progress
- the resulting live squad

Temporary invalid states are allowed while the plan is being assembled. An
unfinished plan may exceed the budget, contain open squad positions or still
have mandatory transfers outstanding. These states are visible and do not block
further planning.

Final submission remains disabled until the future validation engine confirms
that the complete plan is valid. Validation therefore controls submission, not
the manager's ability to explore and combine transfer decisions.

## Information Architecture

The assistant separates planning information into three focused surfaces:

1. The guided workflow contains only the current transfer task.
2. The Transferplan contains summary metrics and one visual card per planned
   transfer.
3. The squad preview contains the complete position-based live squad.

The workflow sequence is visible as:

Transfer starten → Transfer planen → Transferplan ansehen → Kader prüfen →
Validieren → Abgeben.

Budget information appears only in the budget card, validation appears only in
the validation card, transfer history appears only in the Transferplan and the
live squad appears only in the squad preview.

## Minimal Sidebar

The permanent sidebar is intentionally limited to four visual cards:

- Transferbudget
- Transferfortschritt
- Validierung
- Aktionen

This keeps orientation available without turning the sidebar into a report. The
complete squad was removed because it competed with the current task and made
the interface unnecessarily dense.

Current squad, budget and position values are derived from the loaded
`TeamService` snapshot plus local draft state. Missing transfer-domain sources
are rendered as unavailable instead of filled with dummy values. The sidebar
does not change the active task.

Purchase price and under-contract status are prepared as future concepts but are
not imported from Player Master. The workspace displays market value only until
those values can be calculated from `SquadAssignment` and transfer rules.

## Transferplan and Squad Preview

Every planned movement is represented by its own card with players, clubs,
positions, transfer type, status and budget effect. Managers can edit or remove
individual planned transfers without scanning a text summary.

The dedicated squad preview groups the selected manager's live squad by
goalkeeper, defence, midfield and attack. Status badges distinguish current,
new, sold and open positions. Slot order is initialized from the official squad
slots, and the role badge derives from the slot (`Stamm` or `Ersatz`). Recently
changed players receive a subtle visual highlight.

## Validation States

The local placeholder model derives one consistent draft status:

- `Entwurf gültig`: every validation condition passes.
- `Entwurf unvollständig`: required planning work is still open.
- `Entwurf fehlerhaft`: budget, squad, position, duplicate or transfer-limit
  validation fails.

A draft is valid only when the budget is non-negative, the transfer limit is
respected, all mandatory transfers are complete, exactly 18 players remain,
the squad contains 2 goalkeepers, 5 defenders, 7 midfielders and 4 attackers,
and no player ID occurs twice.

The validation card renders these conditions directly from local draft state.
Static or contradictory validation labels are not used.

## Transfer Limit

The temporary UI shell still exposes four free transfers. Mandatory-transfer
count is zero until a live mandatory replacement source exists. Planning
controls are disabled when the relevant local limit is reached and the UI shows
`Maximale Transferanzahl erreicht.`

## Submission Blocking

Temporary invalid or incomplete states remain visible while the manager builds
the plan. They never appear as valid. The final submission action stays disabled
until every validation condition passes, preventing an invalid draft from being
submitted.

## Visual Squad Check

The squad check is a dedicated visual step rather than a sidebar list. Position
cards show all players with club, position grouping and one status badge:
`Aktuell`, `Neu`, `Verkauft` or `Offen`. Changed rows are highlighted so the
new-season squad can be understood quickly.

## Usability

The workflow reduces simultaneous choices, preserves whitespace and makes the
next action explicit. Managers can focus on one transfer without losing the
overall draft status.

Current draft interactions are local only. Future domain services will provide
transfer rules, candidate lists, mandatory replacements, validation, budget
effects and persistence without changing the guided presentation model or its
plan-first behavior.
