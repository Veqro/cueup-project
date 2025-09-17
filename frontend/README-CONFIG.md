# 🚀 CueUp - Backend & Session Konfiguration

## 📡 Backend-URL einfach ändern

**Problem gelöst!** Du kannst jetzt die Backend-URL zentral ändern, falls du wieder gekickt wirst.

### So änderst du die Backend-URL:

1. **Öffne `config.js`**
2. **Ändere nur diese eine Zeile:**
   ```javascript
   BACKEND_URL: 'https://DEINE-NEUE-URL.com',
   ```
3. **Fertig!** Alle Seiten verwenden automatisch die neue URL.

### 📝 Beispiel für neuen Server:
```javascript
// Alte URL:
BACKEND_URL: 'https://cueup-project.onrender.com',

// Neue URL (z.B. bei Providerwechsel):
BACKEND_URL: 'https://cueup-new-server.railway.app',
```

## ⏰ Session-Dauer anpassen

### Standard: 30 Tage angemeldet bleiben
Du kannst die Anmeldedauer in `config.js` ändern:

```javascript
// 30 Tage (Standard)
SESSION_DURATION: 30 * 24 * 60 * 60 * 1000,

// 90 Tage (3 Monate)
SESSION_DURATION: 90 * 24 * 60 * 60 * 1000,

// 365 Tage (1 Jahr)
SESSION_DURATION: 365 * 24 * 60 * 60 * 1000,
```

### 🔄 Auto-Verlängerung
- Session wird automatisch verlängert bei Aktivität
- Benutzer müssen sich seltener neu anmelden
- Funktioniert wie bei großen Websites (Amazon, Google)

## ⚙️ Erweiterte Einstellungen

### Request-Timeout anpassen:
```javascript
REQUEST_TIMEOUT: 15000, // 15 Sekunden statt 10
```

### Max-Retries für fehlerhafte Requests:
```javascript
MAX_RETRIES: 5, // 5 Versuche statt 3
```

## 🛠️ Debug-Informationen

Öffne die **Browser-Konsole** (F12) auf jeder Seite:
- Session-Status wird angezeigt
- Backend-URL wird geloggt
- Auto-Verlängerungen werden dokumentiert

## 📁 Dateien die geändert wurden:

### ✅ Neue Dateien:
- `config.js` - Zentrale Konfiguration
- `README-CONFIG.md` - Diese Anleitung

### ✅ Erweiterte Dateien:
- `modern-auth.js` - Längere Sessions & Config-Integration
- `startpage.html` - Auto-Wake-System
- Alle `*.html` - Config-Integration

## 🚨 Wichtige Hinweise:

1. **Nach Änderungen in config.js**: Seite neu laden (F5)
2. **Bei Server-Problemen**: Debug-Seite verwenden (`debug.html`)
3. **Session-Reset**: Browser-Cache löschen falls nötig
4. **Backup**: config.js vor Änderungen sichern

## 🔧 Schnelle Server-URL Änderung:

**Eine-Zeile-Befehl für neuen Server:**
```javascript
// In Browser-Konsole eingeben (temporär):
window.CONFIG.BACKEND_URL = 'https://NEUE-URL.com';
```

**Dann permanent in config.js speichern!**

---
*Erstellt am: 17. September 2025*
*System: Zentrale Backend-Konfiguration*