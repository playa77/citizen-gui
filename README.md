# Citizen-GUI

Eine grafische Oberfläche für **Citizen** — die freie, lokale, evidenzgebundene
Analyse-Engine für behördliche Schreiben in der eigenen Angelegenheit.

> **Rechtsinformation, keine Rechtsberatung.** Citizen-GUI ersetzt keine
> anwaltliche Beratung und keine Beratungsstelle. Maßgeblich ist der rechtliche
> Hinweis des Citizen-Projekts in der jeweils bestätigten Fassung.

## Status

Frühe Projektphase. Dieses Repository enthält bislang nur Gerüst und
Dokumentation — es sind noch keine Technologie-, Architektur- oder
Design-Entscheidungen getroffen. Nichts hier ist als Festlegung zu lesen.

## Worum es geht

Citizen liest Korrespondenz ein (Bescheid, Kündigung, Mahnbescheid) und
beantwortet vier Fragen: **Was steht da drin? Stimmt das? Bis wann muss ich
reagieren? Was mache ich jetzt?** Jede Aussage wird an den Gesetzestext
gebunden, Berechnungen und Fristen werden deterministisch nachgerechnet.
Citizen bereitet vor; entschieden wird von Menschen.

Der Citizen-Kern ist bewusst **API-only**: Die versionierte REST-Schnittstelle
unter `/api/v1` ist seine einzige externe Schnittstelle, es gibt dort kein
Web-UI und keinen GUI-Client. Die Bürger-Oberfläche ist ein eigenes Vorhaben —
dieses Repository ist der Ort dafür. Wie sie aussieht, worauf sie läuft und wie
sie ausgeliefert wird, ist offen.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/CITIZEN-README.md](docs/CITIZEN-README.md) | Überblick über Citizen: Funktionen, Architektur, Betrieb, Konfiguration |
| [docs/CITIZEN-API_DOCUMENTATION.md](docs/CITIZEN-API_DOCUMENTATION.md) | Vollständiger API-Vertrag — reicht allein, um einen Client dagegen zu bauen |
| [LICENSE](LICENSE) | MIT-Lizenz |

Beide Dokumente beschreiben **Citizen**, nicht Citizen-GUI. Sie liegen hier als
Referenz für die Schnittstelle und das fachliche Modell.

## Offen (Stand: initiales Gerüst)

- Technologie-Stack und Framework
- Architektur und Verhältnis zum Citizen-Kern (eigenständig, eingebettet, verteilt)
- Zielumgebung, Installation und Auslieferung
- Gestaltung, Bedienführung, Barrierefreiheit
- Projektstruktur, Build, Tests und Beitragsregeln

## Lizenz

MIT-Lizenz — siehe [LICENSE](LICENSE).
