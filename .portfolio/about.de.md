## Fotografie-Portfolio

Ein modernes, headless Fotografie-Portfolio, entwickelt mit Next.js und einem integrierten CMS. Das Portfolio richtet sich an professionelle Fotografen und bietet ein sicheres Kunden-Dashboard zur Bildfreigabe.

### Kernfunktionen

- **Mehrsprachigkeit (i18n)** für Deutsch und Englisch mit automatischer Weiterleitung
- **Kunden-Dashboard** mit passwortgeschütztem Zugang zur Bildfreigabe
- **Dynamisches CMS** für einfache Inhaltsverwaltung ohne Code-Änderungen
- **Galerien** mit optimierten WebP-Bildern und Lazy Loading
- **Kontaktformular** mit E-Mail-Benachrichtigung
- **Responsives Design** mit Tailwind CSS und shadcn/ui

### Technische Architektur

Das Projekt folgt einer Headless-CMS-Architektur, bei der Next.js als Frontend die Inhalte via API vom CMS abruft. Die Internationalisierung wird über next-intl realisiert, während die Bildoptimierung automatisch durch Next.js Image und sharp-Komprimierung erfolgt.
