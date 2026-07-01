Feature 2 – Mein Team
Sprint 4.3 – Kader Overview Prototype

Context:
The current application shell exists.
The tab "Mein Team → Kader" exists as a placeholder.
We now build the first playable Kader page.

Goal:
The Kader page should not be a plain player table only.
It should answer the question:

"How good were my squad decisions?"

Use dummy data only.
No database access.
No authentication.
No backend work.

Keep the existing application shell and navigation.

Page concept:
The squad page has two layers:

1. Squad interpretation
2. Detailed player table

------------------------------------------------

SECTION 1 – Squad Status

Create a strong overview area at the top.

Show:

- Squad value
- Remaining budget
- Number of players
- Average points per player
- Team form
- Strongest unit
- Weakest unit

Use cards and short insight labels.

Example:
Strongest unit: Midfield
Weakest unit: Defence
Insight: "Midfield carries the team"

------------------------------------------------

SECTION 2 – Decision Review

Create a section that evaluates the manager's squad decisions.

Use dummy values.

Show three cards:

1. Best value player
Example:
Luca Weber
6.2 Mio €
94 points
15.2 points per million
Badge: "Bargain"

2. Biggest disappointment
Example:
David König
11.5 Mio €
42 points
Badge: "Below expectation"

3. Most important player
Example:
Jonas Hartmann
154 points
18% of team points
Badge: "Key player"

Important:
This section should feel like an evaluation of the manager's squad planning, not just player statistics.

------------------------------------------------

SECTION 3 – Position Units

Show four position groups:

- Goalkeeper
- Defence
- Midfield
- Attack

Each group shows:

- total points
- average points per player
- trend
- short insight

Example:
Defence
112 points
-18% below team average
Insight: "Needs attention"

------------------------------------------------

SECTION 4 – Player Table

Create a clean player table.

Columns:

- Player
- Position
- Bundesliga club
- Status
- Appearances
- Average grade
- Points per game
- Real goals
- Cards
- Team of the Day
- Total points
- Market value

Status examples:
- Top form
- Reliable
- Watch
- Below expectation
- Bargain

Keep the table readable.
Do not overload it visually.

------------------------------------------------

SECTION 5 – Filters / Views

Above the table, add simple view buttons:

- All
- Top form
- Bargains
- Below expectation
- Regular starters
- Watchlist

No real filtering logic required yet.
Visual only.

------------------------------------------------

Design principles:

- The squad comes before individual players.
- Emotion is built on top of real statistics.
- Do not remove classic statistics.
- Add interpretation and context.
- Use short labels, not prose.
- No long paragraphs.
- No fake story text.
- Use dummy data only.

------------------------------------------------

Not in this sprint:

- No transfers
- No editing players
- No real data
- No database
- No authentication
- No advanced sorting logic

------------------------------------------------

Validation:

Run lint.
Run production build.

Definition of Done:

The Kader page gives the manager both:
1. an emotional interpretation of the squad
2. a classic detailed player table