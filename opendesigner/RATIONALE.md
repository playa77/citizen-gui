# Why Citizen-GUI looks the way it does

## What we built
Citizen-GUI is a graphical interface for Citizen — the free, local, evidence-based analysis engine for official correspondence and administrative notices (*Bescheide, Kündigungen, Mahnbescheide*). It is designed for citizens and advocates who need to read official letters, verify claims against statutory text, calculate deadlines deterministically, and decide their next legal steps without ambiguity or distraction.

## The five choices that shape everything
1. **Personality:** We chose a serious, authoritative, and sober tone (like a legal reference tool) because citizens inspecting notices often deal with stressful, high-stakes administrative deadlines. The main alternative was friendly and casual; that would have felt trivializing for legal and financial matters.
2. **Platforms:** We chose the Web first because it ensures universal access across devices without installation hurdles, while respecting responsive layouts on phones and desktop monitors.
3. **Visual direction:** We chose a flat, high-clarity structure (`flat2`). It keeps borders thin (1 px), surfaces clean, and visual noise minimal, ensuring statutory citations (§) and deadline indicators receive primary attention.
4. **Density:** We chose regular everyday density (14–16 px typography, 36–40 px controls) balancing data density with readability, backed by an uncompromising 44 px touch target padding.
5. **Brand color role:** We chose Charcoal Ink (`#334155`) as a focused, single primary accent. It provides judicial authority without harsh black, with automatic accessible adaptation (`#7285A2`) in dark mode.

## What the rules guarantee
- Text contrast of at least 4.5:1 (3:1 for large text and controls) in light and dark mode.
- Touch and click targets of at least 24 px on web (with 44 px min tap area).
- A visible 2 px focus ring with 2 px offset on every interactive element.
- Motion that strictly respects `prefers-reduced-motion` (instant transitions or 200 ms non-spatial fades).

## What is still open
- Assumed answers to confirm: Product purpose and goals derived from README.md.
- Assets pending: Official project logo SVG / wordmark (hook H-logo).
- User research: User desk research is drafted in `opendesigner/research/plan.json` and currently deferred.

## How to ask for a change
Design system updates should be coordinated with the project maintainers. Ask your agent to use the `opendesigner-extend` skill. It reads this system first, shows what a change would move, and records the new decision in `opendesigner/decisions.md`.

## For designers
The core tokens and standards are established. Open designer tasks include providing an SVG logo or wordmark, defining custom iconography for legal statuses (e.g., valid, contested, expired deadline), and empty states for document upload.

---
Footnotes: Q-aud-01 (D-0008), raw.brandColor (D-0010), Q-plat-01 (D-0011), taste.feelWords (D-0013), Q-scope-06 (D-0015).
