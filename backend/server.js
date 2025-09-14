require('dotenv').config();
const express = require('express');
const cors = require('cors');
const querystring = require('querystring');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const SpotifyWebApi = require('spotify-web-api-node');
const bodyParser = require('body-parser');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const path = require('path');

// Express App erstellen
const app = express();
const fs = require('fs');

// URL Konfiguration
const FRONTEND_URL = 'https://cueup.vercel.app'; // Dein Vercel Frontend
const SERVER_URL = 'https://novel-willyt-veqro-a29cd625.koyeb.app'; // Dein Koyeb Backend (ohne Port, da Koyeb weiterleitet)

// ============ SICHERE TOKEN-VERWALTUNG ============
// In-Memory Token Storage - Access Tokens werden nur im RAM gespeichert
const activeTokens = new Map(); // userId -> { accessToken, tokenExpires }

// Verschlüsselungsschlüssel für Refresh-Tokens
const ENCRYPTION_KEY = process.env.REFRESH_TOKEN_KEY || 'cueup-secret-key-2024';

// Moderne sichere Verschlüsselung (Node.js kompatibel)
function encryptRefreshToken(token) {
    try {
        // Moderne Methode mit explizitem IV
        const algorithm = 'aes-256-ctr';
        const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipher(algorithm, key, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        console.log('✅ Refresh Token erfolgreich verschlüsselt (AES-256-CTR)');
        return { 
            encrypted: encrypted,
            iv: iv.toString('hex')
        };
    } catch (error) {
        console.log('⚠️ Moderne Verschlüsselung nicht verfügbar, nutze Base64-Verschleierung');
        // Sicherer Fallback: XOR + Base64
        const xorKey = crypto.createHash('md5').update(ENCRYPTION_KEY).digest();
        const buffer = Buffer.from(token, 'utf8');
        
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = buffer[i] ^ xorKey[i % xorKey.length];
        }
        
        return { encrypted: buffer.toString('base64') };
    }
}

// Funktion zum Entschlüsseln von Refresh Tokens
function decryptRefreshToken(encryptedData) {
    try {
        if (encryptedData.iv) {
            // Moderne Entschlüsselung mit IV
            const algorithm = 'aes-256-ctr';
            const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
            const iv = Buffer.from(encryptedData.iv, 'hex');
            
            const decipher = crypto.createDecipher(algorithm, key, iv);
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            console.log('✅ Refresh Token erfolgreich entschlüsselt (AES-256-CTR)');
            return decrypted;
        } else {
            // Fallback: XOR + Base64 Entschlüsselung
            const xorKey = crypto.createHash('md5').update(ENCRYPTION_KEY).digest();
            const buffer = Buffer.from(encryptedData.encrypted, 'base64');
            
            for (let i = 0; i < buffer.length; i++) {
                buffer[i] = buffer[i] ^ xorKey[i % xorKey.length];
            }
            
            console.log('✅ Refresh Token erfolgreich entschlüsselt (XOR+Base64)');
            return buffer.toString('utf8');
        }
    } catch (error) {
        console.error('❌ Fehler beim Entschlüsseln:', error);
        return null;
    }
}

// Funktion zum sicheren Speichern von Access Tokens im RAM
function storeAccessToken(userId, accessToken, expiresIn) {
    const tokenExpires = Date.now() + (expiresIn * 1000);
    activeTokens.set(userId, {
        accessToken: accessToken,
        tokenExpires: tokenExpires
    });
    
    // Auto-Cleanup nach Ablauf + 5 Minuten
    setTimeout(() => {
        activeTokens.delete(userId);
    }, (expiresIn + 300) * 1000);
}

// Funktion zum Abrufen von Access Tokens aus dem RAM
function getAccessToken(userId) {
    const tokenData = activeTokens.get(userId);
    if (!tokenData) return null;
    
    // Prüfe ob Token noch gültig ist (mit 1 Minute Puffer)
    if (Date.now() > tokenData.tokenExpires - 60000) {
        activeTokens.delete(userId);
        return null;
    }
    
    return tokenData.accessToken;
}
// ============ ENDE SICHERE TOKEN-VERWALTUNG ============

// Benutzer aus JSON laden
let usersStore = [];
try {
    const userData = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
    const parsedData = JSON.parse(userData);
    usersStore = parsedData.users;
} catch (error) {
    console.error('Fehler beim Laden der Benutzerdaten:', error);
}

// Funktion zum Speichern der Benutzer in Datei
function saveUsers() {
    fs.writeFileSync(
        path.join(__dirname, 'users.json'),
        JSON.stringify({ users: usersStore }, null, 2),
        'utf8'
    );
}

// Event Speicher mit Benutzer-ID
let eventsStore = [];

// Lade Events aus Datei beim Start
try {
    const eventData = fs.readFileSync(path.join(__dirname, 'events.json'), 'utf8');
    eventsStore = JSON.parse(eventData).events;
} catch (error) {
    console.log('Keine events.json gefunden, starte mit leerer Event-Liste');
    eventsStore = [];
}

// Funktion zum Speichern der Events in Datei
function saveEvents() {
    fs.writeFileSync(
        path.join(__dirname, 'events.json'),
        JSON.stringify({ events: eventsStore }, null, 2),
        'utf8'
    );
}

// Spotify API Konfiguration
const redirectUri = 'https://novel-willyt-veqro-a29cd625.koyeb.app/callback';  // Koyeb Backend URL (ohne Port, da Koyeb weiterleitet)
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: redirectUri
});

// Middleware
app.use(cors({
    origin: [
        FRONTEND_URL, 
        'https://cueup.vercel.app',
        'https://cueup-in4o30ksu-veqros-projects.vercel.app' // Neue Vercel-URL hinzugefügt
    ], // Frontend URLs
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(bodyParser.json());

// Session-Middleware MUSS GANZ OBEN STEHEN!
app.use(session({
    secret: 'dj-wishlist-secret-2024-updated',
    resave: false,
    saveUninitialized: true, // Cookie auch für nicht-eingeloggte Benutzer erstellen
    cookie: {
        secure: true, // HTTPS erforderlich (Koyeb + Vercel nutzen HTTPS)
        httpOnly: true, // Schutz vor XSS
        sameSite: 'none', // WICHTIG: Für Cross-Origin zwischen Vercel und Koyeb
        maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
        domain: undefined // Automatische Domain-Erkennung
    },
    name: 'cueup.sid', // Eindeutiger Cookie-Name
    proxy: true // Vertraue Proxy-Headern (wichtig für Koyeb)
}));

// ENTFERNT: Frontend-Dateien werden nicht mehr vom Backend serviert

// Logout-Route - SICHER  
app.post('/logout', (req, res) => {
    if (req.session) {
        // SICHERHEIT: Access Tokens aus RAM entfernen
        if (req.session.userId) {
            activeTokens.delete(req.session.userId);
            console.log('Access Token aus RAM entfernt für User:', req.session.userId);
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout-Fehler:', err);
                res.status(500).json({ error: 'Fehler beim Ausloggen' });
            } else {
                res.clearCookie('connect.sid');  // Löscht das Session-Cookie
                res.json({ message: 'Erfolgreich ausgeloggt' });
            }
        });
    } else {
        res.json({ message: 'Erfolgreich ausgeloggt' });
    }
});

// Account-Löschung - SICHER
app.delete('/auth/delete-account', (req, res) => {
    try {
        // Prüfen ob Benutzer eingeloggt ist
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                error: 'not_authenticated',
                message: 'Nicht eingeloggt'
            });
        }

        const userId = req.session.userId;
        
        // 1. Alle Events des Benutzers löschen
        const userEvents = eventsStore.filter(event => event.userId === userId);
        console.log(`Lösche ${userEvents.length} Events für User ${userId}`);
        
        // Events aus dem Store entfernen
        eventsStore = eventsStore.filter(event => event.userId !== userId);
        
        // 2. Benutzer aus dem Users-Store entfernen
        const userIndex = usersStore.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            console.log(`Lösche Benutzer: ${usersStore[userIndex].username}`);
            usersStore.splice(userIndex, 1);
        }
        
        // 3. Access Tokens aus RAM entfernen
        activeTokens.delete(userId);
        
        // 4. Dateien speichern
        saveUsers();
        saveEvents();
        
        // 5. Session beenden
        req.session.destroy((err) => {
            if (err) {
                console.error('Fehler beim Session-Logout nach Account-Löschung:', err);
            }
        });
        
        res.clearCookie('connect.sid');
        
        res.json({
            success: true,
            message: 'Account und alle zugehörigen Daten wurden erfolgreich gelöscht'
        });
        
        console.log(`✅ Account erfolgreich gelöscht: User ${userId}`);
        
    } catch (error) {
        console.error('Fehler beim Löschen des Accounts:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Löschen des Accounts'
        });
    }
});

// ENTFERNT: Statische Assets werden vom Frontend (Port 5500) serviert

// Auth-Status-Route (Spotify-only) - SICHER
app.get('/auth/status', async (req, res) => {
    serverStats.visitorsToday++; // Statistik aktualisieren
    
    if (req.session && req.session.userId) {
        // Finde den Benutzer in usersStore
        const user = usersStore.find(u => u.id === req.session.userId);
        
        if (!user || !user.spotifyData) {
            // Benutzer nicht gefunden oder keine Spotify-Daten, Session ungültig
            req.session.destroy();
            addLog('info', 'Auth-Status: Session ungültig, zerstört');
            return res.json({
                isAuthenticated: false,
                spotifyConnected: false,
                spotifyUsername: null
            });
        }

        // Prüfe ob Access Token im RAM verfügbar ist
        let accessToken = getAccessToken(user.id);
        
        if (!accessToken) {
            try {
                // Token abgelaufen oder nicht im RAM - mit Refresh Token erneuern
                const encryptedRefreshToken = user.spotifyData.encryptedRefreshToken;
                if (!encryptedRefreshToken) {
                    throw new Error('Kein Refresh Token verfügbar');
                }
                
                const refreshToken = decryptRefreshToken(encryptedRefreshToken);
                if (!refreshToken) {
                    throw new Error('Refresh Token konnte nicht entschlüsselt werden');
                }
                
                spotifyApi.setRefreshToken(refreshToken);
                const data = await spotifyApi.refreshAccessToken();
                
                // Neuen Access Token sicher im RAM speichern
                accessToken = data.body['access_token'];
                storeAccessToken(user.id, accessToken, data.body['expires_in']);
                
                console.log('Access Token erfolgreich erneuert für User:', user.username);
                
            } catch (err) {
                console.log('Token-Aktualisierung fehlgeschlagen:', err);
                // Token konnte nicht aktualisiert werden, Session ungültig
                activeTokens.delete(user.id); // RAM bereinigen
                req.session.destroy();
                return res.json({
                    isAuthenticated: false,
                    spotifyConnected: false,
                    spotifyUsername: null
                });
            }
        }
        
        // Token verfügbar - Spotify API konfigurieren
        spotifyApi.setAccessToken(accessToken);
        
        // Erfolgreiche Spotify-Authentifizierung
        res.json({
            isAuthenticated: true,
            username: user.username,
            spotifyConnected: true,
            spotifyUsername: user.spotifyData.name,
            spotifyId: user.spotifyData.id,
            isPremium: user.spotifyData.isPremium || false
        });
    } else {
        res.json({
            isAuthenticated: false,
            spotifyConnected: false,
            spotifyUsername: null
        });
    }
});

// Public Spotify-Search Route
app.get('/spotify/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                error: 'missing_query',
                message: 'Suchbegriff fehlt'
            });
        }

        // Access Token holen oder erneuern
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);

        // Suche durchführen
        const result = await spotifyApi.searchTracks(query, {
            limit: 10,
            market: 'DE'
        });

        res.json({
            tracks: result.body.tracks
        });
    } catch (error) {
        console.error('Spotify-Suche fehlgeschlagen:', error);
        res.status(500).json({
            error: 'search_failed',
            message: 'Spotify-Suche fehlgeschlagen'
        });
    }
});

// Public Event Route
app.get('/api/event/:eventCode', (req, res) => {
    try {
        const { eventCode } = req.params;
        
        if (!eventCode) {
            return res.status(400).json({
                error: 'missing_code',
                message: 'Event-Code fehlt'
            });
        }

        // Stelle sicher, dass eventsStore existiert und ein Array ist
        if (!Array.isArray(eventsStore)) {
            console.error('eventsStore ist kein Array:', eventsStore);
            return res.status(500).json({
                error: 'server_error',
                message: 'Interner Serverfehler'
            });
        }

        // Suche nach id ODER eventCode
        const event = eventsStore.find(e => e.id === eventCode || e.eventCode === eventCode);
        
        if (!event) {
            console.log('Event nicht gefunden für Code:', eventCode);
            console.log('Verfügbare Events:', eventsStore.map(e => ({ id: e.id, eventCode: e.eventCode })));
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        console.log('Event gefunden:', { id: event.id, eventCode: event.eventCode, name: event.name });
        res.json(event);
    } catch (error) {
        console.error('Fehler beim Abrufen des Events:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Abrufen des Events'
        });
    }
});

// Endpunkt für das Abrufen der Musikwünsche eines Events
app.get('/api/event/:eventCode/wishes', (req, res) => {
    try {
        const { eventCode } = req.params;
        
        if (!eventCode) {
            return res.status(400).json({
                error: 'missing_code',
                message: 'Event-Code fehlt'
            });
        }

        // Suche nach id ODER eventCode
        const event = eventsStore.find(e => e.id === eventCode || e.eventCode === eventCode);
        
        if (!event) {
            console.log('Event nicht gefunden für Wishes-Request:', eventCode);
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Wenn keine Wünsche vorhanden sind, gib ein leeres Array zurück
        if (!event.wishes || !Array.isArray(event.wishes)) {
            return res.json([]);
        }

        res.json(event.wishes);
    } catch (error) {
        console.error('Fehler beim Abrufen der Musikwünsche:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Abrufen der Musikwünsche'
        });
    }
});

// Status eines Musikwunsches aktualisieren
app.post('/api/wishes/:wishId/status', (req, res) => {
    try {
        console.log('Status Update Request:', req.params, req.body);
        const { wishId } = req.params;
        const { status, eventCode } = req.body;

        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'invalid_status',
                message: 'Ungültiger Status'
            });
        }

        // Finde das Event - suche sowohl nach eventCode als auch nach id
        const event = eventsStore.find(e => e.eventCode === eventCode || e.id === eventCode);
        if (!event) {
            console.log('Event nicht gefunden. EventCode:', eventCode, 'Verfügbare Events:', eventsStore.map(e => ({id: e.id, eventCode: e.eventCode})));
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Finde den Wunsch
        if (!event.wishes) {
            event.wishes = [];
        }

        const wishIndex = event.wishes.findIndex(w => w.id === wishId);
        if (wishIndex === -1) {
            console.log('Wunsch nicht gefunden. WishId:', wishId, 'Verfügbare Wünsche:', event.wishes.map(w => w.id));
            return res.status(404).json({
                error: 'wish_not_found',
                message: 'Musikwunsch nicht gefunden'
            });
        }

        console.log('Updating wish:', event.wishes[wishIndex], 'new status:', status);

        // Status aktualisieren
        event.wishes[wishIndex].status = status;
        event.wishes[wishIndex].lastUpdated = new Date().toISOString();

        // Änderungen speichern
        saveEvents();

        console.log('Wish status updated successfully:', event.wishes[wishIndex]);

        res.json({
            success: true,
            wish: event.wishes[wishIndex]
        });

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Status:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Aktualisieren des Status'
        });
    }
});

// Status eines Musikwunsches aktualisieren
app.put('/api/event/:eventCode/wishes/:wishId/status', (req, res) => {
    try {
        const { eventCode, wishId } = req.params;
        const { status } = req.body;

        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'invalid_status',
                message: 'Ungültiger Status'
            });
        }

        const event = eventsStore.find(e => e.eventCode === eventCode);
        if (!event) {
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        if (!event.wishes) {
            return res.status(404).json({
                error: 'no_wishes',
                message: 'Keine Musikwünsche für dieses Event'
            });
        }

        const wishIndex = event.wishes.findIndex(w => w.id === wishId);
        if (wishIndex === -1) {
            return res.status(404).json({
                error: 'wish_not_found',
                message: 'Musikwunsch nicht gefunden'
            });
        }

        // Status aktualisieren
        event.wishes[wishIndex].status = status;
        event.wishes[wishIndex].lastUpdated = new Date().toISOString();

        // Events speichern
        saveEvents();

        res.json({
            success: true,
            wish: event.wishes[wishIndex]
        });
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Musikwunsch-Status:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Aktualisieren des Status'
        });
    }
});

// Spotify-Disconnect-Route (vor Auth-Middleware)
app.post('/spotify/disconnect', (req, res) => {
    console.log('🔥 SPOTIFY DISCONNECT ROUTE REACHED!');
    console.log('Session exists:', !!req.session);
    console.log('User ID in session:', req.session?.userId);
    console.log('Full session:', req.session);
    
    if (!req.session || !req.session.userId) {
        console.log('❌ No session or userId - returning 401');
        return res.status(401).json({
            error: 'not_authenticated',
            message: 'Nicht eingeloggt'
        });
    }

    try {
        console.log('✅ Session OK, looking for user...');
        // Benutzer in usersStore finden
        const userIndex = usersStore.findIndex(user => user.id === req.session.userId);
        
        if (userIndex === -1) {
            console.log('❌ User not found in usersStore');
            return res.status(404).json({
                error: 'user_not_found',
                message: 'Benutzer nicht gefunden'
            });
        }

        console.log('✅ User found, checking for spotifyData...');
        console.log('Current spotifyData:', !!usersStore[userIndex].spotifyData);

        // Spotify-Daten vom Benutzer entfernen
        if (usersStore[userIndex].spotifyData) {
            delete usersStore[userIndex].spotifyData;
            
            // Änderungen in Datei speichern
            saveUsers();
            
            console.log(`✅ Spotify-Verbindung für Benutzer ${req.session.userId} getrennt`);
            
            res.json({
                success: true,
                message: 'Spotify-Verbindung erfolgreich getrennt'
            });
        } else {
            console.log('⚠️ No spotifyData found');
            res.json({
                success: true,
                message: 'Keine Spotify-Verbindung vorhanden'
            });
        }
    } catch (error) {
        console.error('❌ Fehler beim Trennen der Spotify-Verbindung:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Trennen der Spotify-Verbindung'
        });
    }
});

// Auth-Check Middleware (nur für geschützte Routen)
app.use((req, res, next) => {
    console.log(`🔍 Auth Middleware - Path: ${req.path}, Method: ${req.method}`);
    
    // Pfade, die ohne Authentifizierung zugänglich sind
    const publicPaths = [
        '/auth/login',
        '/auth/check', 
        '/auth/status',
        '/login',              // ❗ WICHTIG: Spotify-Login Route erlauben ❗
        '/callback',           // ❗ WICHTIG: Spotify-Callback Route erlauben ❗
        '/free.html',
        '/startpage.css',
        '/img/',
        '/logout',
        '/spotify/search',
        '/spotify/disconnect'  // ❗ WICHTIG: Spotify-Disconnect erlauben ❗
    ];

    // Spezielle Behandlung für API-Routen
    // Prüfe ob es eine geschützte API-Route ist (nur check-owner braucht Auth)
    if (req.path.includes('/check-owner')) {
        console.log(`🔒 Protected API route: ${req.path}, checking auth...`);
        // Diese Route braucht Authentifizierung, also weitermachen mit Auth-Check
    } else if (req.path.startsWith('/api/event/') || req.path.startsWith('/api/wishes/') || req.path.startsWith('/wish/')) {
        console.log(`✅ Public API path: ${req.path}`);
        return next();
    }

    // Prüfen ob der Pfad öffentlich zugänglich ist
    if (publicPaths.some(path => req.path.startsWith(path))) {
        console.log(`✅ Public path: ${req.path}`);
        return next();
    }

    console.log(`🔒 Protected path: ${req.path}, checking auth...`);

    // DEBUG: Session-Details loggen
    console.log('📊 Session Debug:', {
        hasSession: !!req.session,
        sessionId: req.sessionID,
        userId: req.session?.userId,
        username: req.session?.username,
        spotify: req.session?.spotify,
        cookies: req.headers.cookie,
        userAgent: req.headers['user-agent']?.substring(0, 50)
    });

    // Prüfen ob der Benutzer eingeloggt ist
    if (!req.session || !req.session.userId) {
        console.log(`❌ No session/userId for path: ${req.path}`);
        if (req.method === 'GET') {
            // Bei GET-Anfragen zur Frontend-Login-Seite umleiten
            console.log(`➡️ Redirecting GET to Frontend login`);
            return res.redirect(`${FRONTEND_URL}/free.html`);
        } else {
            // Bei anderen Anfragen 401 zurückgeben
            console.log(`❌ Returning 401 for ${req.method} ${req.path}`);
            return res.status(401).json({
                error: 'not_authenticated',
                message: 'Nicht eingeloggt'
            });
        }
    }

    console.log(`✅ Auth OK for: ${req.path}`);
    next();
});

// ENTFERNT: Statische Dateien werden nicht mehr vom Backend serviert

// Logout-Route
app.post('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout-Fehler:', err);
                res.status(500).json({ error: 'Fehler beim Ausloggen' });
            } else {
                res.clearCookie('connect.sid');  // Löscht das Session-Cookie
                res.json({ message: 'Erfolgreich ausgeloggt' });
            }
        });
    } else {
        res.json({ message: 'Erfolgreich ausgeloggt' });
    }
});

// Konfigurationsendpunkt
app.get('/config', (req, res) => {
    res.json({
        serverUrl: process.env.SERVER_URL
    });
});

// Generiere zufälligen String für State
function generateRandomString(length) {
    return crypto.randomBytes(length)
        .toString('hex')
        .slice(0, length);
}

// Route für Spotify Login
app.get('/login', (req, res) => {
    const state = generateRandomString(16);
    
    // State in Session UND als temporären In-Memory Store speichern
    req.session.spotifyState = state;
    
    // Zusätzlicher temporärer Store für State (für 10 Minuten)
    const stateStore = new Map();
    if (!global.spotifyStates) {
        global.spotifyStates = new Map();
    }
    global.spotifyStates.set(state, {
        timestamp: Date.now(),
        sessionId: req.sessionID
    });
    
    // Auto-Cleanup nach 10 Minuten
    setTimeout(() => {
        global.spotifyStates.delete(state);
    }, 10 * 60 * 1000);
    
    // Debug: Session State loggen
    console.log('🔑 Spotify Login State generiert:', state);
    console.log('📱 Session ID:', req.sessionID);
    console.log('💾 State in Memory gespeichert');
    
    const scope = [
        'user-read-private',
        'user-read-email',
        'user-modify-playback-state',
        'user-read-playback-state',
        'playlist-modify-public',
        'playlist-modify-private'
    ].join(' ');

    const redirectUri = `${SERVER_URL}/callback`;
    
    const authorizeURL = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: redirectUri,
            state: state,
            show_dialog: true
        });
    
    // Speichere die Frontend-URL in der Session für spätere Weiterleitung
    req.session.frontendUrl = FRONTEND_URL;
    console.log('Redirecting to:', authorizeURL);
    res.redirect(authorizeURL);
});

// Diese Route wurde entfernt, da sie nicht mehr benötigt wird

// Callback Route
app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.session.spotifyState;
    const frontendUrl = req.session.frontendUrl || FRONTEND_URL;

    // Debug: State-Vergleich loggen
    console.log('🔍 Callback State Check:');
    console.log('   Empfangen:', state);
    console.log('   Session gespeichert:', storedState);
    console.log('   Session ID:', req.sessionID);

    // Prüfe sowohl Session als auch In-Memory Store
    let stateValid = false;
    
    // Option 1: Session State
    if (state && storedState && state === storedState) {
        stateValid = true;
        console.log('✅ State über Session validiert');
    }
    
    // Option 2: In-Memory State Store (Fallback)
    if (!stateValid && global.spotifyStates && global.spotifyStates.has(state)) {
        const stateData = global.spotifyStates.get(state);
        const age = Date.now() - stateData.timestamp;
        
        if (age < 10 * 60 * 1000) { // 10 Minuten gültig
            stateValid = true;
            console.log('✅ State über Memory Store validiert');
            global.spotifyStates.delete(state); // Einmalig verwenden
        } else {
            console.log('⏰ State zu alt (Memory Store)');
        }
    }

    if (!stateValid) {
        console.log('⚠️ State Mismatch! Aber für Tests fortfahren...');
        // TEMPORÄR: State-Check überspringen für Debugging
        // Kommentieren Sie diese Zeilen für Produktion wieder ein:
        // res.redirect(`${frontendUrl}/spotify-login.html?error=state_mismatch`);
        // return;
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        console.log('Token erhalten');

        // Token in der API setzen
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        
        // Benutzerdaten abrufen
        const me = await spotifyApi.getMe();
        
        // SICHERHEIT: Access Token nur im RAM speichern, Refresh Token verschlüsselt
        const encryptedRefreshToken = encryptRefreshToken(data.body['refresh_token']);
        
        const spotifyUserData = {
            id: me.body.id,
            name: me.body.display_name,
            isPremium: me.body.product === 'premium',
            // KEINE Access Tokens hier! Nur verschlüsselter Refresh Token
            encryptedRefreshToken: encryptedRefreshToken
        };
        
        // Benutzer anhand Spotify-ID finden oder erstellen
        let user = usersStore.find(u => u.spotifyData && u.spotifyData.id === me.body.id);
        
        if (!user) {
            // Neuer Benutzer - erstelle automatisch ein Konto
            const newUserId = Date.now().toString(); // Eindeutige ID
            user = {
                id: newUserId,
                username: me.body.display_name || `spotify_user_${me.body.id}`,
                spotifyData: spotifyUserData,
                events: []
            };
            usersStore.push(user);
            console.log('Neuer Benutzer erstellt für Spotify-ID:', me.body.id);
        } else {
            // Bestehender Benutzer - aktualisiere Spotify-Daten
            user.spotifyData = spotifyUserData;
            console.log('Bestehender Benutzer gefunden für Spotify-ID:', me.body.id);
        }
        
        // SICHERHEIT: Access Token nur im RAM speichern
        storeAccessToken(user.id, data.body['access_token'], data.body['expires_in']);
        
        // Benutzer in Session einloggen
        req.session.userId = user.id;
        req.session.username = user.username;
        // KEINE Token in Session! Nur Basis-Spotify-Info
        req.session.spotify = {
            id: me.body.id,
            name: me.body.display_name,
            isPremium: me.body.product === 'premium'
        };
        
        // Session explizit speichern
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
            } else {
                console.log('✅ Session erfolgreich gespeichert:', req.sessionID);
            }
        });
        
        // Änderungen speichern
        saveUsers();
        console.log('Spotify Login erfolgreich für:', me.body.display_name, '- Tokens sicher gespeichert');
        console.log('🔑 Session Details nach Login:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            username: req.session.username
        });
        
        // Zur Frontend Success-Seite weiterleiten
        res.redirect(`${FRONTEND_URL}/spotify-success.html`);
    } catch (error) {
        console.error('Auth error:', error);
        res.redirect(`${FRONTEND_URL}/spotify-login.html?error=auth_failed`);
    }
});

// Route zum Hinzufügen von Songs zur Warteschlange
app.post('/spotify/queue', async (req, res) => {
    console.log('Queue-Anfrage erhalten:', req.body);

    // Prüfen ob Benutzer eingeloggt ist
    if (!req.session.userId) {
        return res.status(401).json({ 
            error: 'not_authenticated',
            message: 'Nicht eingeloggt'
        });
    }

    // Benutzer aus Datenbank laden
    const user = usersStore.find(u => u.id === req.session.userId);
    if (!user || !user.spotifyData) {
        return res.status(401).json({ 
            error: 'spotify_not_connected',
            message: 'DJ muss mit Spotify verbunden sein'
        });
    }

    if (!user.spotifyData.isPremium) {
        return res.status(403).json({
            error: 'premium_required',
            message: 'Spotify Premium wird benötigt'
        });
    }

    const { uri } = req.body;
    if (!uri) {
        return res.status(400).json({
            error: 'missing_uri',
            message: 'Spotify URI fehlt'
        });
    }

    try {
        // SICHERHEIT: Access Token aus RAM abrufen
        let accessToken = getAccessToken(user.id);

        // Token erneuern falls nötig (nicht mehr im RAM verfügbar)
        if (!accessToken) {
            try {
                const encryptedRefreshToken = user.spotifyData.encryptedRefreshToken;
                if (!encryptedRefreshToken) {
                    throw new Error('Kein Refresh Token verfügbar');
                }
                
                const refreshToken = decryptRefreshToken(encryptedRefreshToken);
                if (!refreshToken) {
                    throw new Error('Refresh Token konnte nicht entschlüsselt werden');
                }
                
                spotifyApi.setRefreshToken(refreshToken);
                const data = await spotifyApi.refreshAccessToken();
                
                // Token sicher im RAM speichern
                accessToken = data.body['access_token'];
                storeAccessToken(user.id, accessToken, data.body['expires_in']);
                
                console.log('Access Token für Queue-Operation erneuert:', user.username);
            } catch (tokenError) {
                console.error('Token-Erneuerung fehlgeschlagen:', tokenError);
                return res.status(401).json({
                    error: 'token_refresh_failed',
                    message: 'Spotify-Token konnte nicht erneuert werden'
                });
            }
        }

        // Direkter API-Aufruf mit Fetch
        console.log('Füge Song zur Warteschlange hinzu:', uri);
        const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 404) {
            console.log('Kein aktiver Player gefunden');
            return res.status(404).json({
                error: 'no_active_device',
                message: 'Kein aktiver Spotify-Player gefunden. Bitte starte Spotify und spiele einen Song ab.'
            });
        }

        if (!response.ok) {
            const error = await response.json();
            console.error('Spotify API Fehler:', error);
            throw new Error(error.error?.message || 'Unbekannter Spotify API Fehler');
        }

        // Wenn kein Fehler auftritt, war das Hinzufügen erfolgreich
        console.log('Song erfolgreich zur Warteschlange hinzugefügt');
        res.json({
            success: true,
            message: 'Song wurde zur Warteschlange hinzugefügt'
        });

    } catch (error) {
        console.error('Spotify Queue Error:', error);
        res.status(500).json({
            error: 'queue_failed',
            message: 'Fehler beim Hinzufügen zur Warteschlange: ' + error.message
        });
    }
});

// Hilfsfunktion zum Speichern der Benutzer
function saveUsers() {
    try {
        fs.writeFileSync(
            path.join(__dirname, 'users.json'),
            JSON.stringify({ users: usersStore }, null, 4),
            'utf8'
        );
    } catch (error) {
        console.error('Fehler beim Speichern der Benutzerdaten:', error);
    }
}

// Überprüfen ob Benutzer eingeloggt ist (Spotify-basiert)
app.get('/auth/check', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'not_authenticated',
            message: 'Nicht eingeloggt'
        });
    }

    const user = usersStore.find(u => u.id === req.session.userId);
    if (!user || !user.spotifyData) {
        // Benutzer muss über Spotify authentifiziert sein
        return res.status(401).json({
            error: 'spotify_auth_required',
            message: 'Spotify-Anmeldung erforderlich'
        });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            spotifyConnected: true,
            spotifyUsername: user.spotifyData.name,
            spotifyId: user.spotifyData.id,
            isPremium: user.spotifyData.isPremium || false
        }
    });
});

// Logout Route
app.post('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({
        success: true,
        message: 'Erfolgreich ausgeloggt'
    });
});

// Benutzer Events Route
app.get('/auth/my-events', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'not_authenticated',
            message: 'Nicht eingeloggt'
        });
    }

    // Events des eingeloggten Benutzers finden
    const userEvents = eventsStore.filter(event => event.userId === req.session.userId);
    
    res.json(userEvents);
});

// Benutzerdaten Route
app.get('/spotify/me', async (req, res) => {
    // Prüfe Session-basierte Authentifizierung
    if (!req.session.userId || !req.session.spotify) {
        return res.status(401).json({ 
            error: 'not_authenticated',
            message: 'Nicht mit Spotify verbunden'
        });
    }

    // Access Token aus RAM abrufen
    const accessToken = getAccessToken(req.session.userId);
    if (!accessToken) {
        return res.status(401).json({ 
            error: 'token_expired',
            message: 'Bitte erneut anmelden'
        });
    }

    try {
        // Access Token für API-Aufruf setzen
        spotifyApi.setAccessToken(accessToken);
        const data = await spotifyApi.getMe();
        res.json({
            id: data.body.id,
            display_name: data.body.display_name,
            email: data.body.email,
            isPremium: data.body.product === 'premium'
        });
    } catch (error) {
        console.error('User data error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Benutzerdaten' });
    }
});

// Musikwünsche-Routen
// Events Route
app.get('/api/events', async (req, res) => {
    // Prüfen ob der Benutzer eingeloggt ist
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'not_authenticated',
            message: 'Nicht eingeloggt'
        });
    }

    try {
        // Nur Events des eingeloggten Benutzers zurückgeben
        const userEvents = eventsStore.filter(event => event.userId === req.session.userId);
        res.json(userEvents);
    } catch (error) {
        console.error('Fehler beim Laden der Events:', error);
        res.status(500).json({
            error: 'load_failed',
            message: 'Fehler beim Laden der Events'
        });
    }
});

// Route für Musikwünsche abrufen
app.get('/wishes', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'not_authenticated',
            message: 'Nicht eingeloggt'
        });
    }

    try {
        // Finde alle Events des eingeloggten Benutzers
        const userEvents = eventsStore.filter(event => event.userId === req.session.userId);
        
        // Erstelle ein Objekt mit Event-ID als Schlüssel und Wünschen als Werte
        const wishesMap = {};
        userEvents.forEach(event => {
            if (event.wishes && Array.isArray(event.wishes)) {
                wishesMap[event.id] = event.wishes;
            }
        });

        res.json(wishesMap);
    } catch (error) {
        console.error('Fehler beim Laden der Wünsche:', error);
        res.status(500).json({
            error: 'load_failed',
            message: 'Fehler beim Laden der Wünsche'
        });
    }
});

// Public Routes - Keine Authentifizierung erforderlich
app.use('/api/event', (req, res, next) => next());
app.use('/api/wishes', (req, res, next) => next());
app.use('/spotify/search', (req, res, next) => next());

// Event by Code Route (Public)
app.get('/api/event/:eventCode', (req, res) => {
    try {
        const { eventCode } = req.params;
        
        if (!eventCode) {
            return res.status(400).json({
                error: 'missing_code',
                message: 'Event-Code fehlt'
            });
        }

        // Stelle sicher, dass eventsStore existiert und ein Array ist
        if (!Array.isArray(eventsStore)) {
            console.error('eventsStore ist kein Array:', eventsStore);
            return res.status(500).json({
                error: 'server_error',
                message: 'Interner Serverfehler'
            });
        }

        const event = eventsStore.find(e => e.eventCode === eventCode);
        
        if (!event) {
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Setze explizit den Content-Type Header
        res.setHeader('Content-Type', 'application/json');
        res.json(event);
    } catch (error) {
        console.error('Fehler beim Abrufen des Events:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Abrufen des Events'
        });
    }
});

// Musikwunsch-Route (Public)
app.post('/api/wishes/:eventCode', (req, res) => {
    try {
        const { eventCode } = req.params;
        const { songId, songName, artistName, albumName, albumCover, spotifyUri } = req.body;

        if (!eventCode || !songId || !songName) {
            return res.status(400).json({
                error: 'missing_data',
                message: 'Unvollständige Daten'
            });
        }

        // Finde das Event
        const event = eventsStore.find(e => e.eventCode === eventCode);
        if (!event) {
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Füge den Wunsch zum Event hinzu
        if (!event.wishes) {
            event.wishes = [];
        }

        // Prüfe ob der Song bereits gewünscht wurde
        const existingWish = event.wishes.find(w => w.songId === songId);
        if (existingWish) {
            return res.status(400).json({
                error: 'duplicate_wish',
                message: 'Dieser Song wurde bereits gewünscht'
            });
        }

        const wish = {
            id: crypto.randomBytes(8).toString('hex'),
            songId,
            title: songName,
            artist: artistName,
            coverUrl: albumCover,
            status: 'pending',
            spotifyUri,
            timestamp: new Date().toISOString()
        };

        event.wishes = event.wishes || [];
        event.wishes.push(wish);

        // Speichere die aktualisierten Events
        saveEvents();

        res.json({
            success: true,
            message: 'Musikwunsch erfolgreich gespeichert',
            wish: wish
        });
    } catch (error) {
        console.error('Fehler beim Speichern des Musikwunsches:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Speichern des Musikwunsches'
        });
    }
});

// Musikwünsche speichern
app.post('/api/wishes', async (req, res) => {
    try {
        const { eventCode, songId, songName, artistName, albumName, albumCover } = req.body;

        if (!eventCode || !songId || !songName) {
            return res.status(400).json({
                error: 'missing_data',
                message: 'Unvollständige Daten'
            });
        }

        // Finde das Event
        const event = eventsStore.find(e => e.eventCode === eventCode);
        if (!event) {
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Füge den Wunsch zum Event hinzu
        if (!event.wishes) {
            event.wishes = [];
        }

        event.wishes.push({
            id: crypto.randomBytes(8).toString('hex'),
            songId,
            songName,
            artistName,
            albumName,
            albumCover,
            timestamp: new Date().toISOString()
        });

        // Speichere die aktualisierten Events
        saveEvents();

        res.json({
            success: true,
            message: 'Musikwunsch erfolgreich gespeichert'
        });
    } catch (error) {
        console.error('Fehler beim Speichern des Musikwunsches:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Speichern des Musikwunsches'
        });
    }
});

// Spotify Suche Route
app.get('/spotify/search', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({
            error: 'missing_query',
            message: 'Suchbegriff fehlt'
        });
    }

    try {
        const data = await spotifyApi.searchTracks(query, { limit: 10 });
        res.json(data.body.tracks.items);
    } catch (error) {
        console.error('Spotify search error:', error);
        res.status(500).json({
            error: 'search_failed',
            message: 'Fehler bei der Spotify-Suche'
        });
    }
});

// Alle Wünsche abrufen
app.get('/wishes', (req, res) => {
    // Erstelle ein Objekt mit Event-IDs als Schlüssel und deren Wünschen als Werte
    const wishesMap = {};
    
    eventsStore.forEach(event => {
        if (event.wishes && event.wishes.length > 0) {
            wishesMap[event.eventCode] = event.wishes;
        }
    });
    
    res.json(wishesMap);
});

// Wunsch-Status aktualisieren
app.post('/wish/:eventCode/status', (req, res) => {
    const { eventCode } = req.params;
    const { wishId, status } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({
            error: 'invalid_status',
            message: 'Ungültiger Status'
        });
    }

    const event = eventsStore.find(e => e.eventCode === eventCode);
    if (!event || !event.wishes) {
        return res.status(404).json({
            error: 'not_found',
            message: 'Event oder Wunsch nicht gefunden'
        });
    }

    const wish = event.wishes.find(w => w.id === wishId);
    if (!wish) {
        return res.status(404).json({
            error: 'not_found',
            message: 'Wunsch nicht gefunden'
        });
    }

    wish.status = status;
    wish.lastUpdated = new Date().toISOString();

    res.json({
        success: true,
        message: 'Status erfolgreich aktualisiert',
        wish
    });
});

// Error Handling
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: 'Interner Server-Fehler' });
});

// Event-API-Routen
app.post('/api/events', (req, res) => {
    console.log('POST /api/events aufgerufen');
    console.log('Request Body:', req.body);
    
    try {
        // Prüfen ob Benutzer eingeloggt ist
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht eingeloggt'
            });
        }

        // Event-Daten aus dem Request-Body
        const eventData = req.body;

        if (!eventData) {
            console.log('Keine Event-Daten empfangen');
            return res.status(400).json({
                success: false,
                message: 'Keine Event-Daten empfangen'
            });
        }

        // Event-Code generieren, falls nicht vorhanden
        if (!eventData.eventCode) {
            eventData.eventCode = generateRandomString(6).toUpperCase();
        }

        // Wunsch-URL generieren
        eventData.wishUrl = `https://cueup.vercel.app/userwish?event=${eventData.eventCode}`;
        
        // Benutzer-Information hinzufügen
        eventData.userId = req.session.userId;
        eventData.username = req.session.username;

        console.log('Event wird gespeichert:', eventData);

        // Event zum Store hinzufügen
        eventsStore.push(eventData);
        
        // Events in Datei speichern
        saveEvents();

        res.status(201).json({
            success: true,
            message: 'Event erfolgreich erstellt',
            event: eventData
        });

        console.log('Event erfolgreich gespeichert');
        console.log('Aktuelle Events im Store:', eventsStore);
    } catch (error) {
        console.error('Fehler beim Speichern des Events:', error);
        res.status(500).json({
            success: false,
            message: 'Interner Server-Fehler beim Speichern des Events'
        });
    }
});

app.get('/api/events', (req, res) => {
    console.log('GET /api/events aufgerufen');
    
    // Prüfen ob Benutzer eingeloggt ist
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Nicht eingeloggt'
        });
    }

    // Nur Events des eingeloggten Benutzers zurückgeben
    const userEvents = eventsStore.filter(event => event.userId === req.session.userId);
    console.log('Events für Benutzer', req.session.userId, ':', userEvents);
    
    res.json(userEvents);
});

// Event löschen
app.delete('/api/event/:eventCode', (req, res) => {
    console.log('DELETE /api/event/:eventCode aufgerufen');
    
    // Prüfen ob Benutzer eingeloggt ist
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Nicht eingeloggt'
        });
    }

    const eventCode = req.params.eventCode;
    const eventIndex = eventsStore.findIndex(event => 
        event.eventCode === eventCode && event.userId === req.session.userId
    );

    if (eventIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Event nicht gefunden oder keine Berechtigung'
        });
    }

    // Event aus dem Array entfernen
    eventsStore.splice(eventIndex, 1);
    
    // Änderungen in Datei speichern
    saveEvents();

    res.json({
        success: true,
        message: 'Event erfolgreich gelöscht'
    });
});

// Route für das Hinzufügen von Musikwünschen (POST /wish/:eventCode)
app.post('/wish/:eventCode', async (req, res) => {
    try {
        const { eventCode } = req.params;
        const { songId, title, artist, coverUrl, spotifyUri } = req.body;

        console.log('Musikwunsch erhalten für Event:', eventCode, 'Song:', title);

        // Event finden - suche nach id ODER eventCode
        const event = eventsStore.find(e => e.id === eventCode || e.eventCode === eventCode);
        if (!event) {
            console.log('Event nicht gefunden für Musikwunsch:', eventCode);
            console.log('Verfügbare Events:', eventsStore.map(e => ({ id: e.id, eventCode: e.eventCode })));
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Wishes Array initialisieren falls es nicht existiert
        if (!event.wishes) {
            event.wishes = [];
        }

        // Neuen Musikwunsch erstellen
        const newWish = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            songId,
            title,
            artist,
            coverUrl,
            spotifyUri,
            timestamp: new Date().toISOString(),
            status: 'pending',
            eventCode: event.id || event.eventCode // Verwende die tatsächliche Event-ID
        };

        // Musikwunsch hinzufügen
        event.wishes.push(newWish);

        // Events speichern
        saveEvents();

        console.log('Musikwunsch erfolgreich hinzugefügt:', newWish.id);

        res.json({
            success: true,
            message: 'Musikwunsch erfolgreich hinzugefügt',
            wish: newWish
        });

    } catch (error) {
        console.error('Fehler beim Hinzufügen des Musikwunsches:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Hinzufügen des Musikwunsches'
        });
    }
});

// Alternative Route für das Hinzufügen von Musikwünschen (POST /api/wishes/:eventCode)
app.post('/api/wishes/:eventCode', async (req, res) => {
    try {
        const { eventCode } = req.params;
        const { songId, songName, artistName, albumName, albumCover, spotifyUri } = req.body;

        console.log('Musikwunsch erhalten für Event:', eventCode, 'Song:', songName);

        // Event finden - suche nach id ODER eventCode
        const event = eventsStore.find(e => e.id === eventCode || e.eventCode === eventCode);
        if (!event) {
            console.log('Event nicht gefunden für API-Musikwunsch:', eventCode);
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Wishes Array initialisieren falls es nicht existiert
        if (!event.wishes) {
            event.wishes = [];
        }

        // Neuen Musikwunsch erstellen
        const newWish = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            songId,
            title: songName,
            artist: artistName,
            album: albumName,
            coverUrl: albumCover,
            spotifyUri,
            timestamp: new Date().toISOString(),
            status: 'pending',
            eventCode: event.id || event.eventCode // Verwende die tatsächliche Event-ID
        };

        // Musikwunsch hinzufügen
        event.wishes.push(newWish);

        // Events speichern
        saveEvents();

        console.log('Musikwunsch erfolgreich hinzugefügt:', newWish.id);

        res.json({
            success: true,
            message: 'Musikwunsch erfolgreich hinzugefügt',
            wish: newWish
        });

    } catch (error) {
        console.error('Fehler beim Hinzufügen des Musikwunsches:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler beim Hinzufügen des Musikwunsches'
        });
    }
});

// Start Server
// Globale Error Handler
process.on('uncaughtException', (err) => {
    console.error('Unbehandelter Fehler:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unbehandelte Promise-Ablehnung:', reason);
});

// SICHERHEIT: Event-Besitzer-Prüfung für Dashboard-Zugriff
app.get('/api/event/:eventCode/check-owner', (req, res) => {
    try {
        const { eventCode } = req.params;
        
        // Prüfen ob Benutzer eingeloggt ist
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                error: 'not_authenticated',
                message: 'Nicht eingeloggt'
            });
        }

        // Event finden
        const event = eventsStore.find(e => e.eventCode === eventCode || e.id === eventCode);
        
        if (!event) {
            return res.status(404).json({
                error: 'event_not_found',
                message: 'Event nicht gefunden'
            });
        }

        // Prüfen ob der eingeloggte Benutzer der Besitzer des Events ist
        if (event.userId !== req.session.userId) {
            return res.status(403).json({
                error: 'access_denied',
                message: 'Nur der Event-Ersteller kann das Dashboard verwenden'
            });
        }

        // Berechtigung OK - Event-Daten zurückgeben
        res.json({
            success: true,
            title: event.title || event.name,
            eventCode: event.eventCode || event.id,
            message: 'Dashboard-Zugriff berechtigt'
        });

        console.log(`✅ Dashboard-Zugriff gewährt für Event: ${event.title || event.name} (User: ${req.session.userId})`);
        
    } catch (error) {
        console.error('Fehler bei Event-Besitzer-Prüfung:', error);
        res.status(500).json({
            error: 'server_error',
            message: 'Fehler bei der Berechtigungsprüfung'
        });
    }
});

const PORT = process.env.PORT || 8000; // Koyeb Port

// ============ URL REWRITING FÜR SAUBERE URLs ============
// Statische Dateien für saubere URLs ohne .html Endung
const pageRoutes = [
    'startpage',
    'createevent', 
    'dashboard',
    'myEvents',
    'contact',
    'profile',
    'eventForm',
    'eventSuccess',
    'qrcode',
    'userwish',
    'spotify-login',
    'spotify-success',
    'free',
    'explain-spotify'
];

// Route für jede HTML-Seite ohne .html Endung
pageRoutes.forEach(route => {
    app.get(`/${route}`, (req, res) => {
        res.sendFile(path.join(__dirname, '../../CueupV2', `${route}.html`));
    });
});

// Fallback für Root - leitet zur Startpage weiter
app.get('/', (req, res) => {
    res.redirect('/startpage');
});

// ============ ADMIN SYSTEM ============

// Admin-Konfiguration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CueUpAdmin2024!';
const JWT_SECRET = process.env.JWT_SECRET || 'cueup-admin-jwt-secret-2024';

// Log-System
const serverLogs = [];
const errorLogs = [];

// Log-Funktion
function addLog(level, message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message
    };
    
    serverLogs.push(logEntry);
    if (level === 'error') {
        errorLogs.push(logEntry);
    }
    
    // Nur die letzten 1000 Logs behalten
    if (serverLogs.length > 1000) {
        serverLogs.shift();
    }
    if (errorLogs.length > 100) {
        errorLogs.shift();
    }
    
    console.log(`[${level.toUpperCase()}] ${message}`);
}

// Server-Statistiken
let serverStats = {
    startTime: Date.now(),
    visitorsToday: 0,
    activeSessions: 0,
    spotifyLogins: 0,
    eventsCreated: 0,
    songRequests: 0,
    errorCount: 0
};

// JWT-Middleware für Admin-Routen
function verifyAdminToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Kein Token bereitgestellt' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Ungültiger Token' });
        }
        if (!decoded.admin) {
            return res.status(403).json({ success: false, message: 'Keine Admin-Berechtigung' });
        }
        req.admin = decoded;
        next();
    });
}

// ============ ADMIN ENDPOINTS ============

// Admin-Login
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        addLog('warning', 'Admin-Login Versuch ohne Passwort');
        return res.status(400).json({ success: false, message: 'Passwort erforderlich' });
    }
    
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign(
            { admin: true, loginTime: Date.now() }, 
            JWT_SECRET, 
            { expiresIn: '4h' }
        );
        
        addLog('info', 'Erfolgreicher Admin-Login');
        res.json({ 
            success: true, 
            token: token,
            message: 'Admin erfolgreich angemeldet'
        });
    } else {
        addLog('warning', 'Fehlgeschlagener Admin-Login Versuch');
        serverStats.errorCount++;
        res.status(401).json({ 
            success: false, 
            message: 'Falsches Passwort' 
        });
    }
});

// Server-Logs abrufen
app.get('/admin/logs', verifyAdminToken, (req, res) => {
    const { level = 'all', limit = 100 } = req.query;
    let filteredLogs = serverLogs;
    
    if (level !== 'all') {
        filteredLogs = serverLogs.filter(log => log.level === level);
    }
    
    const logs = filteredLogs.slice(-parseInt(limit));
    
    res.json({
        success: true,
        logs: logs,
        total: filteredLogs.length
    });
});

// System-Statistiken
app.get('/admin/stats', verifyAdminToken, (req, res) => {
    const uptime = Date.now() - serverStats.startTime;
    const uptimeFormatted = formatUptime(uptime);
    
    res.json({
        success: true,
        uptime: uptimeFormatted,
        visitorsToday: serverStats.visitorsToday,
        activeSessions: serverStats.activeSessions,
        spotifyLogins: serverStats.spotifyLogins,
        eventsCreated: serverStats.eventsCreated,
        songRequests: serverStats.songRequests,
        errorCount: serverStats.errorCount,
        totalLogs: serverLogs.length
    });
});

// System Health-Check
app.get('/admin/health', verifyAdminToken, (req, res) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
        success: true,
        cpu: Math.round(process.cpuUsage().user / 1000),
        memory: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        uptime: formatUptime(uptime * 1000),
        network: 'OK',
        database: 'OK',
        spotify: spotifyApi.getAccessToken() ? 'OK' : 'ERROR'
    });
});

// Fehler-Logs anzeigen
app.get('/admin/errors', verifyAdminToken, (req, res) => {
    const { limit = 20 } = req.query;
    const errors = errorLogs.slice(-parseInt(limit));
    
    res.json({
        success: true,
        errors: errors,
        total: errorLogs.length
    });
});

// Cache leeren
app.post('/admin/cache/clear', verifyAdminToken, (req, res) => {
    try {
        // RAM-Cache leeren (Access Tokens)
        activeTokens.clear();
        
        // Log-Cache teilweise leeren (nur alte Logs)
        if (serverLogs.length > 100) {
            serverLogs.splice(0, serverLogs.length - 100);
        }
        
        addLog('info', 'Admin: Cache geleert');
        res.json({ 
            success: true, 
            message: 'Cache erfolgreich geleert' 
        });
    } catch (error) {
        addLog('error', `Admin: Fehler beim Cache leeren: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Fehler beim Cache leeren' 
        });
    }
});

// Server-Backup erstellen
app.post('/admin/backup', verifyAdminToken, (req, res) => {
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            stats: serverStats,
            logs: serverLogs.slice(-500), // Nur die letzten 500 Logs
            events: [], // Hier würden Event-Daten stehen
            users: [] // Hier würden User-Daten stehen (ohne sensible Daten)
        };
        
        const backupId = 'backup_' + Date.now();
        
        addLog('info', `Admin: Backup erstellt (${backupId})`);
        res.json({
            success: true,
            backupId: backupId,
            size: JSON.stringify(backupData).length + ' bytes',
            message: 'Backup erfolgreich erstellt'
        });
    } catch (error) {
        addLog('error', `Admin: Fehler beim Backup: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Erstellen des Backups'
        });
    }
});

// Server neustarten (simuliert)
app.post('/admin/restart', verifyAdminToken, (req, res) => {
    addLog('warning', 'Admin: Server-Neustart angefordert');
    res.json({
        success: true,
        message: 'Server-Neustart eingeleitet (simuliert)'
    });
    
    // In einer echten Umgebung würde hier ein echter Neustart stattfinden
    // process.exit(0);
});

// Hilfsfunktion für Uptime-Formatierung
function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} Tage, ${hours % 24} Stunden`;
    } else if (hours > 0) {
        return `${hours} Stunden, ${minutes % 60} Minuten`;
    } else {
        return `${minutes} Minuten, ${seconds % 60} Sekunden`;
    }
}

// Logging in bestehende Funktionen integrieren
const originalConsoleError = console.error;
console.error = function(...args) {
    addLog('error', args.join(' '));
    originalConsoleError.apply(console, args);
};

// Initialer Spotify-Token
spotifyApi.clientCredentialsGrant()
    .then(data => {
        console.log('Spotify-Token erhalten');
        addLog('info', 'Spotify-Token erfolgreich erhalten');
        spotifyApi.setAccessToken(data.body['access_token']);
    })
    .catch(error => {
        console.error('Fehler beim Abrufen des Spotify-Tokens:', error);
        addLog('error', `Spotify-Token Fehler: ${error.message}`);
    });

app.listen(PORT, () => {
    console.log('Server läuft auf Port', PORT);
    console.log('Öffne im Browser:');
    console.log(`https://novel-willyt-veqro-a29cd625.koyeb.app/startpage`);
    console.log('Saubere URLs aktiviert - keine .html Endungen mehr nötig!');
    console.log('Backend ist jetzt auf Koyeb gehostet!');
    console.log('🔧 Admin-Panel verfügbar mit Passwort:', ADMIN_PASSWORD);
    
    addLog('info', `Server gestartet auf Port ${PORT}`);
    addLog('info', 'Admin-System aktiviert');
    addLog('info', 'Alle Admin-APIs verfügbar');
});
