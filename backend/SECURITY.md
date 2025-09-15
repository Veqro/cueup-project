# 🔐 CueUp Backend - Sichere Konfiguration

## Sicherheitshinweise

⚠️ **WICHTIG**: Die API Keys werden NICHT in Dateien gespeichert, sondern über Umgebungsvariablen gesetzt!

## Koyeb Deployment Setup

### 1. Umgebungsvariablen im Koyeb Dashboard setzen

Gehe zu: `Koyeb Dashboard > Dein Service > Settings > Environment variables`

**Erforderliche Variablen:**

```bash
# Spotify API (von https://developer.spotify.com)
SPOTIFY_CLIENT_ID=dein_echter_spotify_client_id
SPOTIFY_CLIENT_SECRET=dein_echter_spotify_client_secret

# Sicherheit (32-Byte Hex-String für Token-Verschlüsselung)
REFRESH_TOKEN_KEY=4f8b2e9c1a6d7f3e8b5c2a1f4d6e9c7b8f2e5a3d7c1f6b9e4a8d2c5f1e7b3a6c

# Server Konfiguration
PORT=3000
SERVER_URL=https://deine-koyeb-url.koyeb.app
FRONTEND_URL=https://cueup.vercel.app
REDIRECT_URI=https://deine-koyeb-url.koyeb.app/callback
```

### 2. Neue Spotify App erstellen

1. Gehe zu https://developer.spotify.com/dashboard
2. Erstelle eine neue App
3. Setze als Redirect URI: `https://deine-koyeb-url.koyeb.app/callback`
4. Kopiere Client ID und Client Secret in die Koyeb Umgebungsvariablen

### 3. Sicherheitsfeatures

✅ **Implementiert:**
- Keine API Keys in Dateien
- Verschlüsselte Refresh Token Speicherung
- Umgebungsvariablen-Validierung beim Start
- .env in .gitignore
- Sichere Session-Verwaltung

🔒 **Token-Sicherheit:**
- Access Tokens nur im RAM (nicht persistent)
- Refresh Tokens verschlüsselt mit AES-256
- Session-basierte Authentifizierung
- Automatische Token-Erneuerung

## Lokale Entwicklung

Für lokale Tests, erstelle eine `.env` Datei (wird nicht committed):

```bash
cp .env.example .env
# Editiere .env mit echten Werten (NUR für lokale Entwicklung!)
```

## Troubleshooting

- Server startet nicht? → Überprüfe Umgebungsvariablen im Koyeb Dashboard
- Spotify Login fehlt? → Überprüfe REDIRECT_URI in Spotify App Settings
- Token Fehler? → Regeneriere REFRESH_TOKEN_KEY (32-Byte Hex)

## Generiere sicheren REFRESH_TOKEN_KEY

```javascript
// In Node.js Console:
crypto.randomBytes(32).toString('hex')
```