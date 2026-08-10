# Season Operations Center

Der Season Operations Center ist der operative Leitstand fuer die aktuelle Saison. Er ersetzt keinen Assistenten und fuehrt Administratoren bewusst nicht durch eine feste Reihenfolge.

## Purpose

`/admin/season` zeigt:

- aktuelle Saison,
- Vorbereitungsstatus,
- welche Competition bereit ist,
- welche Competition noch Arbeit braucht,
- aktuelle Aufgaben,
- juengste Saisonaktivitaet.

Die Seite nutzt in Sprint 15.1 ausschliesslich Fixtures. Es gibt keine Backend-Writes, keine Persistenz und keine Engine-Aufrufe.

## Independent Competition Lifecycles

Jede Competition hat einen eigenen Lifecycle. Eine Liga kann bereits aktiv sein, waehrend eine andere Liga noch keinen Spielplan hat. Pokal, Europapokal und Supercup folgen ebenfalls eigenen fachlichen Schritten.

Beispiel fuer einen generischen Competition-Lifecycle:

ANGELEGT

↓

SPIELPLAN

↓

AKTIV

↓

ABGESCHLOSSEN

Dieser Ablauf ist bewusst nur ein Statusmodell pro Competition. Er erzwingt keine globale Saisonreihenfolge.

## Why This Is Not A Season Wizard

Ein Wizard wuerde eine lineare Reihenfolge unterstellen. Das passt nicht zum BMS-Betrieb, weil Wettbewerbe unabhaengig vorbereitet werden koennen:

- Liga 1 kann spielbereit sein,
- Liga 2 kann noch einen Spielplan brauchen,
- Pokal kann bereits ausgelost sein,
- Europapokal kann noch Teilnehmer benoetigen,
- Supercup kann separat angelegt werden.

Der Season Operations Center macht diese parallelen Zustaende sichtbar und laesst jeden Wettbewerb eigenstaendig oeffnen oder vorbereiten.
