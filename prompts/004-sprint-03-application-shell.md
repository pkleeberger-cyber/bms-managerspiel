Sprint 3.1 – Application Shell & Manager Dashboard

Context

Project: BMS Managerspiel

Existing infrastructure and domain models already exist.

This sprint creates the permanent application shell.

No authentication.

No business logic.

No database access.

Only dummy data.

⸻

Goal

Build the permanent layout that will remain for future development.

The layout should already feel like the final application.

⸻

General Layout

The application consists of four areas:

1. Manager Header
2. Main Navigation
3. Context Navigation
4. Content Area

Desktop first.

Responsive for tablet.

Mobile optimisation is not required yet.

⸻

1. Manager Header

The manager header is always visible.

It contains placeholder information.

Create cards or clearly separated information blocks for:

* Manager Logo
* Manager Name
* Current Season
* League
* Current Form / Winning or Losing Streak
* League Position
* League Points
* Goals (manager scoring used as match goals)
* Squad Value
* Next Match
* Last Five Matches

Example:

Manager: Patrick

League: Erste Liga

Points: 34

Goals: 812 : 745

Form:
W W D L W

Next Match:
vs FC Bayern Manager

⸻

2. Main Navigation

Horizontal navigation below the manager header.

Entries:

* Mein Team
* Wettbewerbe
* News
* Forum
* Administration

Administration is only a placeholder.

Do not implement permissions yet.

⸻

3. Context Navigation

Context navigation changes depending on the selected main section.

Implement only the following two sections now.

Mein Team

Tabs:

* Übersicht
* Kader
* Transfers
* Spiele
* Historie

Wettbewerbe

Tabs:

* Erste Liga
* Zweite Liga
* Pokal
* Europapokal
* Supercup

News, Forum and Administration may show placeholder pages.

⸻

4. Dashboard Content

The default page is:

Mein Team → Übersicht

Create a professional placeholder dashboard.

Use reusable cards.

Include placeholder widgets for:

* Budget
* Squad Value
* Current League Position
* Next Match
* Last Match
* Latest News
* Quick Actions

No real data.

No backend calls.

⸻

Design

Use a clean neutral layout.

No external admin template.

No football styling yet.

Prepare reusable UI components.

⸻

Technical Requirements

Create reusable layout components.

Keep navigation independent from business logic.

Prepare routing for future pages.

No authentication.

No MongoDB calls.

⸻

Validation

Run:

* lint
* production build

Application must compile successfully.

Definition of Done

The application opens with a professional dashboard shell containing:

* Manager Header
* Main Navigation
* Context Navigation
* Placeholder Dashboard

No business logic implemented.