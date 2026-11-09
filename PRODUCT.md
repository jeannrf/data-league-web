# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript, Tailwind CSS, Firebase (Hosting, Auth, Firestore) as backend. Decided in SRS.md (sections 2.4 and 7.2). The first delivery is the public landing only; Firebase wiring comes with the application form (SRS phase 2).

## Users

- **Visitor:** undergraduate university or institute students in Peru, technical and non-technical, who arrive mostly from social media on a phone. Job: understand what Data League is, whether they qualify, and apply before 29 Nov 2026.
- **Applicant:** a student applying alone or as a team of 2 to 4. Only the team leader creates an account.
- **Admin:** the organizing team (later phases, not this delivery).

## Product Purpose

Data League is the inter-university and institutional data science league. The 2026 edition is hosted at the Universidad Nacional de Ingeniería (UNI), Lima, with the motto "Aprende. Demuestra. Conecta." The web platform has a public landing, an application system and an admin panel (SRS.md). Success for the landing: a qualified student understands the offer and starts an application. Targets: 300+ applicants, 120 participants at the final, 20+ communities.

## Positioning

A league that rotates between universities (UNI this year; UNALM, UNMSM and others later), open to technical and non-technical students, built on the idea of connecting people, communities and universities across Peru.

## Operating Context

- Applications close 29 Nov 2026, 23:59 Peru time (UTC−5).
- Virtual sessions: 27/11 kick-off and data storytelling, 30/11 machine learning, 01/12 AI with applications and MVP, 02/12 data governance.
- In-person final on 5 Dec 2026 at the UNI, about 120 people.
- Five tracks: 01 Estado, Economía y Sociedad; 02 Salud, Vida y Bienestar; 03 Ciudades, Producción y Ambiente; 04 Deporte, Cultura y Entretenimiento; 05 Educación, Ciencia y Tecnología.
- Language: Spanish (Peru). Mobile-first, from 360 px.

## Capabilities and Constraints

- Eligibility: active undergraduate university or institute student, 18 or older. Teams of 2 to 4; applications are free.
- Applications open about 12–13 Nov. Until then the landing says "Postulaciones abren pronto" and the apply button is not active.
- Prizes and jury: shown as "Próximamente", no amounts and no names (RN-11).
- Kick-off date confirmed as 27 Nov (the cover slide says 28; the user chose 27).
- Open facts, not to be invented: official contact email and social networks ([TBD-10]); partner logos and exact names ([TBD-07]); the rules text ([TBD-11]); how finalists are selected ([TBD-02]); platform for the virtual sessions ([TBD-06]).
- Budget near zero, `*.web.app` URL, privacy law 29733 applies.

## Brand Commitments

- Name "DATA LEAGUE": "DATA" in white, "LEAGUE" in blue, uppercase bold sans.
- Motto: "Aprende. Demuestra. Conecta."
- Colors from the kick-off cover: near-black `#070A10`, blue `#4162FF`, yellow `#FFDE41`, white. Dark theme only.
- The Peru map made of connected nodes is the identity motif (docs/design/portada-kickoff.png).
- Institutional partners: DMC Institute, Data Science, Facultad de Ingeniería Económica, Estadística y Ciencias Sociales (UNI). Community partners include Unicode. Exact names pending.

## Evidence on Hand

- docs/design/portada-kickoff.png: the cover art.
- KICK OFF PDF (8 pages) with the event content.
- No testimonials, past-edition results, prizes, jury or partner logos exist yet. Do not fabricate them.

## Product Principles

1. The application deadline and the apply action are always visible and truthful.
2. Plain, close language; no data-science jargon without a short explanation.
3. Connection (people, communities, universities) is the idea of the product, not a decoration.
4. Never claim what is not confirmed: prizes, jury, partners and selection criteria stay "Próximamente" or "por confirmar".

## Accessibility & Inclusion

WCAG 2.1 AA, keyboard navigation, labelled controls (RNF-18). Respect `prefers-reduced-motion`. Must be fast on mid-range phones over 4G (LCP under 2.5 s).
