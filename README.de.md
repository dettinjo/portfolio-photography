<!-- portfolio:date=2025-09-07 -->
# Fotografie-Portfolio & Kundenportal

**[English](README.md) · [Deutsch](README.de.md)**

<p align="center"><img src="docs/screenshots/home.jpg" alt="Startseite mit vollflächigem Foto und Überschrift" width="100%" /></p>

Fotografie-Portfolio und Kundenportal in einer Next.js-App: Lightroom-Exporte in Nextcloud werden zur öffentlichen Website und zu privaten Kundengalerien, verwaltet über ein eingebettetes Payload CMS und per Webhooks synchronisiert.

## Highlights

- **Ingest-Pipeline von Nextcloud zur Website** — WebDAV-Webhooks mit Debounce pro Ordner plus ein 15-Minuten-Abgleich machen aus Exporten AVIF/WebP-Größen (sharp), Unschärfe-Platzhalter, Dominanzfarben und EXIF-Metadaten ohne GPS; Nextcloud-Datei-IDs halten Neu-Exporte als Versionen fest.
- **Der ganze Kundenablauf in einem Portal** — passwortlose Anmeldung per E-Mail-Link mit HMAC-signiertem Session-Cookie, Angebote mit Anzahlung, Auswahl auf Vorschauen mit Wasserzeichen samt Favoriten und verorteten Notizen, Korrekturrunden mit Vorher/Nachher-Regler und fertige Fotos für 12 Monate mit gestreamten ZIP-Downloads.
- **Zahlungen mit Stripe** — Checkout für Anzahlung und Restzahlung, signaturgeprüfte Webhooks, die jedes Ereignis nur einmal verarbeiten, Zahlungsstatus, die nur vorwärts gehen, und Downloads erst nach beglichener Restzahlung.
- **Installierbare PWA** — Serwist Service Worker, Web Push (VAPID), ein Android-Teilen-Ziel ins Handy-Studio des Fotografen, offline gespeicherte Galerien und Favoriten, die sich bei wiederhergestellter Verbindung synchronisieren.
- **Teilen und Einwilligung** — Gast-Links per Token mit optionalen Downloads in Webgröße, Veröffentlichungs-Einwilligung pro Foto und Kundenbewertungen, die erst nach Freigabe öffentlich werden.
- **Zweisprachig und selbst gehostet** — Englisch und Deutsch mit next-intl; ein Verfügbarkeitskalender aus Projektterminen und einem optionalen iCal-Feed; Payload-Migrationen laufen beim Start in einem Docker-Image aus GitHub Actions.

<p align="center">
  <img src="docs/screenshots/series.jpg" alt="Eine Fotoserie im Blocksatz-Raster" width="49%" /> <img src="docs/screenshots/sessions.jpg" alt="Seite mit den Angeboten" width="49%" />
</p>

## Was drin ist

**Öffentliche Website** — Startseite mit Fotostrom und Genre-Filter, Serienseiten, eine teilbare Seite pro Foto mit Vollbild-Betrachter, Über-mich-Seite mit FAQ, Angebotsseite mit Schritt-für-Schritt-Shootingplaner und Kontakt.

**Kundenportal (`/c`)** — eine Seite pro Projekt mit aktueller Phase und nächstem Schritt, Planung (Fragen, Ablauf, Shotlist, Moodboard), Auswahl, fertige Fotos, Änderungswünsche, Nachrichten, Bewertung und Einwilligung pro Foto.

**Studio (`/studio`)** — eine handyfreundliche Admin-Ansicht: Posteingang für Nachrichten, Anfragen, Änderungswünsche und Bewertungen; Projekte nach Phase; Uploads nach Nextcloud; Statistiken der letzten 12 Monate.

## Architektur

```
Lightroom ──Export──▶ Nextcloud ──Webhook / 15-Min-Abgleich──▶ Sync-Warteschlange
                                                                   │ sharp: AVIF/WebP-Größen, Wasserzeichen, Metadaten
                                                                   ▼
                       PostgreSQL ◀── Payload CMS (Local API) ◀── Next.js-15-App ──▶ Medienspeicher
                                                                   │
                    Website · Kundenportal · /studio · /admin · Stripe · SMTP · Web Push
```

- **Ein Prozess.** Payload 3 läuft in der Next.js-App; Seiten und API-Routen nutzen die Local API, es gibt keinen separaten CMS-Dienst.
- **Drei Bildbereiche.** Portfolio-Fotos, Kundenvorschauen mit Wasserzeichen und fertige Fotos liegen getrennt; private Bilder gehen nur an die Kunden des Projekts oder an Admins.
- **Speicher als Quelle der Wahrheit.** Die Fotos liegen in Nextcloud; die Website hält nur neu erzeugbare Ableitungen, ein verlorener Cache entsteht beim nächsten Sync neu.
- **Hintergrundarbeit in der App.** Eine serielle Sync-Warteschlange und eine Housekeeping-Schleife kümmern sich um Ablauf-Erinnerungen, Löschungen, Bewertungseinladungen und den Abgleich offener Zahlungen.

## Tech-Stack

Next.js 15 · React 19 · TypeScript · Payload CMS 3 · PostgreSQL · Tailwind CSS · next-intl · sharp · Serwist (PWA) · Stripe · Web Push · Nextcloud (WebDAV) · Docker · GitHub Actions

## Lokal starten

Voraussetzungen: Node.js 22 und Docker.

```bash
cp .env.example .env.local            # benötigte Werte eintragen
docker compose up -d pg-photography   # PostgreSQL auf Port 5433
npm install
npm run dev                           # http://localhost:3000, Admin unter /admin
```

`POSTGRES_URL` auf die lokale Datenbank setzen und `PAYLOAD_SECRET` auf eine lange Zufallszeichenkette. Die Nextcloud-Einstellungen auf eine eigene Instanz zeigen lassen oder `SYNC_DISABLED=true` setzen, um ohne Foto-Sync zu starten; E-Mails brauchen die SMTP-Einstellungen. Stripe und Web Push bleiben aus, bis ihre Schlüssel gesetzt sind. Schemaänderungen laufen über `npm run migrate:create <name>`; Migrationen werden beim Serverstart angewendet.
