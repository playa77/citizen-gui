# Citizen-GUI

Eine freie, lokale und evidenzgebundene grafische Benutzeroberfläche für **Citizen** — die Analyse-Engine für behördliche Schreiben in der eigenen Angelegenheit.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0.0-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com)
[![WCAG](https://img.shields.io/badge/WCAG-2.2%20AA-success.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-Art.%2050%20Compliant-003399.svg)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689)

> **Rechtsinformation, keine Rechtsberatung.**  
> Citizen-GUI ersetzt keine anwaltliche Beratung und keine Beratungsstelle. Das System bereitet behördliche Korrespondenz strukturiert für den Termin bei einer Rechtsanwältin, einem Rechtsanwalt oder einer Beratungsstelle vor (*Mandatsvorbereitungs-Dossier*). Entschieden und unterschrieben wird stets von Menschen.

---

## Worum es geht

Bürgerinnen und Bürger, die einen Bescheid (z. B. Bürgergeld / SGB II), eine Kündigung oder einen Mahnbescheid erhalten, stehen oft vor unverständlichem Amtsdeutsch und drohenden Fristabläufen.

Citizen-GUI beantwortet vier fundamentale Fragen ohne Spekulation:
1. **Was steht da drin?** — Strukturierte Extraktion von Sachverhalt, Rechtsbehelfsbelehrung und behördlicher Berechnung.
2. **Stimmt das?** — Abgleich jeder Tatsachen- und Rechtsbehauptung mit dem Gesetzestext; mathematische Nachberechnung von Bescheiden.
3. **Bis wann muss ich reagieren?** — Auf den Tag genaue Fristberechnung inklusive Bekanntgabefiktion (§ 37 Abs. 2 SGB X), Widerspruchsfrist (§ 84 SGG) und Werktag-/Feiertags-Rollover (§ 64 SGG).
4. **Was mache ich jetzt?** — Generierung unterschriftsreifer Verfahrensschreiben (*Widerspruch, Überprüfungsantrag nach § 44 SGB X, Akteneinsichtsantrag nach § 25 SGB X*).

---

## Kernfunktionen

- **Dokumentaufnahme & OCR-Prüfung:** Lokaler Upload von Bescheiden (PDF, JPG, PNG, TXT, HTML, EML; bis 25 MB). Automatische Bewertung der Erkennungsqualität (`/api/v1/ocr/assess`) und verpflichtende Nutzerprüfung des extrahierten Texts vor Beginn der Analyse.
- **Echtzeit-Streaming per SSE:** Verfolgung des Analysefortschritts über 11 aufeinanderfolgende Stufen (`corpus_health` bis `calculation_check`) mit Live-Token-Streaming und automatischem Timeout-Watchdog.
- **Evidenzgebundene Ausgaben:** Jeder gefundene Claim ist über semantische Suche (`pgvector`) an Gesetzesabsätze gebunden. Ein Klick auf ein Zitat öffnet den Fundstellen-Drawer mit dem exakten Wortlaut der Rechtsnorm.
- **Deterministische SGB II-Berechnungskaskade:** Centgenaue Gegenüberstellung von *„Jobcenter hat gerechnet“* vs. *„Gesetzeskonform wäre“* nach der vollständigen § 11b SGB II-Bereinigung.
- **Menschliche Adjudikation:** Bürgerinnen und Bürger bestätigen oder widersprechen einzelnen Befunden per Klick und können fehlerhafte Beträge oder Annahmen vor der Dokumentenerstellung korrigieren.
- **Verfahrensdokumente mit Prüf-Warnung:** Erstellung maßgeschneiderter Anträge und Widersprüche. Automatische Ausfüllung persönlicher Daten im Browser. Nicht zweifelsfrei belegte Stellen werden auffällig als `[BITTE PRÜFEN]` hervorgehoben.
- **Volle KI-Transparenz (EU AI Act):** Anzeige des gesetzlichen Hinweises nach Art. 50(1) vor der Präsentation von Ergebnissen; Mitführung und Export maschinenlesbarer Provenienz-Metadaten (`citizen-provenance-v1.1`).
- **Nüchternes, barrierefreies Design:** Basierend auf dem [OpenDesigner](DESIGN.md)-Designsystem (`#334155` Charcoal Ink, `flat2`, WCAG 2.2 AA Kontrast ≥ 4.5:1, mindestens 44 px Touch-Target-Padding, 0 ms Übergänge bei Tastaturaktionen, reduzierte Bewegung).
- **Prüfstand & Systemdiagnose:** Eingebauter Inspektor für Gesetzesmodule, Korpus-Indexierungsstatus und automatisierte Regressionsreports gegen das Golden Set.

---

## Architektur

Citizen-GUI ist als schlanke, zustandslose Single Page Application (SPA) konzipiert, die über einen gehärteten Nginx-Reverse-Proxy mit dem [Citizen](docs/CITIZEN-README.md)-Kern kommuniziert:

```
┌────────────────────────────────────────────────────────┐
│                      Browser                           │
│  React 19 SPA (OpenDesigner Tokens + Tailwind CSS v4) │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / SSE (:3000)
┌──────────────────────────▼─────────────────────────────┐
│             Nginx Reverse Proxy & Static               │
│   - Proxy Buffering: OFF (SSE Streaming bis 540s)      │
│   - Content Security Policy (CSP) & Sanitization       │
└──────────────────────────┬─────────────────────────────┘
                           │ Proxy /api/v1/ (:8000)
┌──────────────────────────▼─────────────────────────────┐
│               Citizen FastAPI Backend                  │
│   - X-Disclaimer-Ack & X-Document-Tag Header-Gates     │
│   - Lokale OCR-Fallback-Kette (pdfplumber/Tesseract)   │
│   - Deterministisches Rechenwerk & Fristen-Engine      │
│   - PostgreSQL 16 + pgvector Gesetzeskorpus            │
└────────────────────────────────────────────────────────┘
```

- **Local-First & Datensouveränität:** Es gibt keine Benutzerkonten und keine externe Telemetrie. Das System läuft lokal oder hinter einem eigenen Authentifizierungs-Proxy.
- **Keine Client-Datenbank:** Der Client hält bis auf wenige flüchtige Einstellungen (`localStorage` für Disclaimer-Bestätigung und Theme) keinen lokalen Zustand. Sämtliche Sitzungen und Dossiers werden von Citizen verwaltet.
- **PII-Schutz:** Personenbezogene Daten werden im Backend vor der Übergabe an Inferenzmodelle pseudonymisiert und erst im fertigen Dokumentenentwurf lokal wieder eingesetzt.

---

## Schnellstart

### 1. Ausführung über Docker Compose (Empfohlen)

Citizen-GUI ist vollständig in das Docker Compose Setup des Gesamtprojekts integriert:

```bash
# 1. Stack bauen und im Hintergrund starten
docker compose up -d --build

# 2. Oberfläche im Browser öffnen
#    -> http://localhost:3000
```

Der Nginx-Container liefert das statische Frontend aus und leitet Anfragen an `/api/` automatisch mit aktivierten Streaming-Parametern an den Container `citizen-app:8000` weiter.

### 2. Lokale Entwicklung

Voraussetzung: Node.js 22+ und eine laufende Instanz des Citizen-Backends auf Port 8000.

```bash
# 1. Abhängigkeiten exakt installieren
npm ci

# 2. Entwicklungsserver mit Hot-Module-Replacement starten (Port 3000)
npm run dev

# 3. Tests ausführen
npm test

# 4. TypeScript-Typen prüfen und Produktions-Build erstellen
npm run build
```

---

## Dokumentation

Die vollständige Architektur, Spezifikation und Umsetzung sind in versionierten Dokumenten unter `docs/` festgehalten:

| Dokument | Zweck & Inhalt |
|---|---|
| [docs/01-DESIGN-DOCUMENT.md](docs/01-DESIGN-DOCUMENT.md) | **Doc 1: Systemarchitektur & Design** — Produktziele, Systemgrenzen, Datenmodelle, Sicherheitsarchitektur und ADRs |
| [docs/02-TECHNICAL-SPEC.md](docs/02-TECHNICAL-SPEC.md) | **Doc 2: Technische Spezifikation** — Vollständige Schnittstellen, Seam Register, Aufrufspuren (*Call Traces*) und Teststrategie |
| [docs/03-IMPLEMENTATION-ROADMAP.md](docs/03-IMPLEMENTATION-ROADMAP.md) | **Doc 3: Implementierungs-Roadmap** — 12 Arbeitspakete (WP-01 bis WP-12) für die autonome Umsetzung durch Coding-Agenten |
| [docs/CITIZEN-API_DOCUMENTATION.md](docs/CITIZEN-API_DOCUMENTATION.md) | **API-Vertrag des Backend-Kerns** — Vollständige Referenz aller REST- und SSE-Routen unter `/api/v1` |
| [docs/CITIZEN-README.md](docs/CITIZEN-README.md) | **Citizen-Kern** — Funktionsweise der Analyse-Pipeline, Inferenzprofile und Rechenwerke |
| [DESIGN.md](DESIGN.md) | **OpenDesigner Designsystem** — Design-Tokens, Typografie, Barrierefreiheit, Standards und Regeln |

---

## Lizenz

Dieses Projekt steht unter der **MIT-Lizenz** — siehe [LICENSE](LICENSE).
