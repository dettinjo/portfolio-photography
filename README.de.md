[Deutsch](README.de.md) · [English](README.md)

# Fotografie-Portfolio

Ein produktionsreifes Fotografie-Portfolio mit Next.js und eingebettetem Payload CMS, Fotos aus Nextcloud und tokenbasierter Bildfreigabe für Kunden — vollständig zweisprachig (EN/DE).

<p align="center">
  <img src="docs/nextjs.svg" alt="Nextjs" width="170" />
</p>

### Kernfunktionen

- **Nextcloud als Bildquelle**: Lightroom-Exporte in einem Nextcloud-Ordner erscheinen automatisch auf der Website
- **Eingebettetes Payload CMS** (Admin unter `/admin`) mit PostgreSQL für Alben, Freigaben und Bewertungen
- **Bildfreigabe** über einen privaten Link — Auswahl, Kommentare und Veröffentlichungszustimmung ohne Konto
- **Bewertungen** von Kunden, sichtbar nach Freigabe im Admin-Bereich
- **Mehrsprachigkeit (i18n)** für Deutsch und Englisch
- **Responsives Design** mit Tailwind CSS und shadcn/ui

### Technische Architektur

Next.js und Payload laufen in einem gemeinsamen Container; der CMS-Zugriff erfolgt serverseitig über die Local API. Fotos werden per WebDAV aus Nextcloud gelesen, mit sharp in WebP umgewandelt und zwischengespeichert. Datenbankmigrationen laufen beim Start automatisch.
