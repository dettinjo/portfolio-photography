[Deutsch](README.de.md) · [English](README.md)

# Fotografie-Portfolio

Ein produktionsreifes Fotografie-Portfolio mit Next.js und Strapi, inklusive passwortgeschütztem Kunden-Dashboard für Bildfreigaben — vollständig zweisprachig (EN/DE).

<p align="center">
  <img src="docs/nextjs.svg" alt="Nextjs" width="170" />
</p>

### Kernfunktionen

- **Mehrsprachigkeit (i18n)** für Deutsch und Englisch mit automatischer Weiterleitung
- **Kunden-Dashboard** mit passwortgeschütztem Zugang zur Bildfreigabe
- **Dynamisches CMS** für einfache Inhaltsverwaltung ohne Code-Änderungen
- **Galerien** mit optimierten WebP-Bildern und Lazy Loading
- **Kontaktformular** mit E-Mail-Benachrichtigung
- **Responsives Design** mit Tailwind CSS und shadcn/ui

### Technische Architektur

Das Projekt folgt einer Headless-CMS-Architektur, bei der Next.js als Frontend die Inhalte via API vom CMS abruft. Die Internationalisierung wird über next-intl realisiert, während die Bildoptimierung automatisch durch Next.js Image und sharp-Komprimierung erfolgt.
