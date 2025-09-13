# CueUp - URL Rewriting Setup

## 🚀 Saubere URLs ohne .html Endungen

Diese Konfiguration ermöglicht professionelle URLs wie:
- `deine-domain.de/createevent` statt `deine-domain.de/createevent.html`
- `deine-domain.de/dashboard` statt `deine-domain.de/dashboard.html`

## 📁 Dateien in diesem Projekt:

### `.htaccess` - Für Apache Server (empfohlen)
- ✅ Funktioniert bei den meisten Hosting-Anbietern
- ✅ Automatische URL-Umleitung
- ✅ Performance-Optimierungen
- ✅ Sicherheits-Features

### `nginx-config.conf` - Für Nginx Server
- Alternative für Nginx-basierte Server
- Gleiche Funktionalität wie .htaccess

## 🔧 Installation:

### Für normale Webhosting (Apache):
1. Lade die `.htaccess` Datei in den Root-Ordner deiner Website hoch
2. Fertig! URLs funktionieren automatisch ohne .html

### Für Nginx Server:
1. Füge den Inhalt von `nginx-config.conf` zu deiner Nginx-Konfiguration hinzu
2. Starte Nginx neu: `sudo systemctl reload nginx`

## 🌐 Funktionsweise:

```
Benutzer tippt:     deine-domain.de/createevent
Server zeigt:       createevent.html
URL bleibt:         deine-domain.de/createevent
```

## ✨ Features:

- **Automatische Umleitung**: .html URLs werden zu sauberen URLs umgeleitet
- **Bidirektional**: Beide URL-Arten funktionieren
- **Root-Redirect**: `/` leitet automatisch zu `/startpage` weiter
- **Performance**: Cache-Einstellungen und Kompression
- **Sicherheit**: Blockiert Zugriff auf sensible Dateien (.json, .log, .env)

## 🧪 Testen:

Nach dem Upload funktionieren diese URLs:
- `/startpage`
- `/createevent`
- `/dashboard`
- `/myEvents`
- `/profile`
- `/contact`
- Alle anderen HTML-Seiten

## 📋 Kompatibilität:

✅ Apache (99% aller Webhosting-Anbieter)
✅ Nginx
✅ Funktioniert mit jedem Standard-Webhosting
✅ Keine Server-Konfiguration nötig (bei Apache)