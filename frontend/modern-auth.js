/**
 * 🚀 CueUp Modern Auth - Instant Navigation System
 * Funktioniert wie moderne Websites (Instagram, YouTube, etc.)
 * KEINE Wartezeiten, SOFORTIGE Navigation
 */

class ModernAuth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.sessionKey = 'cueup_session';
        
        // Sofort beim Laden initialisieren
        this.init();
    }

    /**
     * Sofortige Initialisierung - KEINE Server-Calls
     */
    init() {
        // Safari-spezifische Spotify-Callback-Behandlung
        if (this.isSafari()) {
            this.handleSafariSpotifyCallback();
        }
        
        // Lokale Session prüfen
        const session = this.getStoredSession();
        if (session && this.isSessionValid(session)) {
            this.isAuthenticated = true;
            this.user = session.user;
            
            // Server-Sync im Hintergrund (non-blocking)
            this.syncWithServerInBackground();
        }
        
        // Navigation sofort verfügbar machen
        this.updateUI();
    }
    
    /**
     * Safari-spezifische Spotify-Callback-Behandlung - iOS optimiert
     */
    async handleSafariSpotifyCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        // Erkennung von Spotify-Callback für Safari/iOS
        const indicators = [
            urlParams.get('spotify_login') === 'success',
            urlParams.get('auth') === 'success',
            urlParams.get('code'), // Spotify Authorization Code
            document.referrer.includes('spotify.com'),
            document.referrer.includes('accounts.spotify.com'),
            window.location.href.includes('spotify')
        ];
        
        if (indicators.some(Boolean)) {
            console.log('🍎📱 Safari iOS Spotify-Login erkannt, starte erweiterte Auth-Wiederherstellung...');
            
            // Für iOS mehrfache Versuche mit verschiedenen Delays
            const delays = isIOS ? [500, 1500, 3000, 5000] : [1000, 2000];
            
            for (const delay of delays) {
                setTimeout(async () => {
                    try {
                        console.log(`🍎 Safari Auth-Check Versuch nach ${delay}ms...`);
                        
                        // Erweiterte Request-Optionen für Safari iOS
                        const response = await fetch(window.ENDPOINTS?.AUTH_STATUS || 'https://cueup-project.onrender.com/auth/status', {
                            method: 'GET',
                            credentials: 'include',
                            cache: 'no-cache',
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Accept': 'application/json'
                            }
                        });
                        
                        console.log(`🍎 Safari Response Status: ${response.status}`);
                        
                        if (response.ok) {
                            const data = await response.json();
                            console.log('🍎 Safari Auth Response:', data);
                            
                            if (data.isAuthenticated) {
                                const userData = {
                                    spotifyUsername: data.spotifyUsername || data.username || 'Spotify User',
                                    spotifyConnected: data.spotifyConnected || true,
                                    isAuthenticated: true,
                                    loginTime: Date.now(),
                                    browser: 'Safari iOS'
                                };
                                
                                this.saveSession(userData);
                                console.log('🍎✅ Safari iOS Session erfolgreich wiederhergestellt:', userData);
                                
                                // Sofortige UI-Aktualisierung
                                this.isAuthenticated = true;
                                this.user = userData;
                                this.updateUI();
                                
                                // URL bereinigen
                                const cleanUrl = window.location.pathname;
                                window.history.replaceState({}, document.title, cleanUrl);
                                
                                // Nach erfolgreichem Login andere Versuche abbrechen
                                return;
                            }
                        }
                    } catch (error) {
                        console.log(`🍎❌ Safari Auth-Check (${delay}ms) fehlgeschlagen:`, error);
                    }
                }, delay);
            }
        }
    }

    /**
     * Session aus localStorage laden - Safari iOS optimiert
     */
    getStoredSession() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const storageKeys = [
            this.sessionKey,
            this.sessionKey + '_safari', 
            this.sessionKey + '_ios',
            'spotify_session_backup'
        ];
        
        console.log('🔍 Suche Session für', this.detectBrowser(), 'iOS:', isIOS);
        
        // Multi-Source Session-Suche
        for (const key of storageKeys) {
            try {
                // localStorage versuchen
                let stored = localStorage.getItem(key);
                if (stored) {
                    console.log('✅ Session gefunden in localStorage[' + key + ']');
                    return JSON.parse(stored);
                }
                
                // sessionStorage versuchen
                stored = sessionStorage.getItem(key);
                if (stored) {
                    console.log('✅ Session gefunden in sessionStorage[' + key + ']');
                    return JSON.parse(stored);
                }
            } catch (error) {
                console.warn('⚠️ Session-Key ' + key + ' beschädigt:', error.name);
                this.cleanupCorruptedSession(key);
            }
        }
        
        // Cookie Fallback für Safari iOS
        if (this.isSafari() && isIOS) {
            try {
                const cookies = document.cookie.split(';');
                for (const cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'cueup_auth' && value) {
                        const decoded = JSON.parse(atob(value));
                        if (decoded.auth && decoded.user) {
                            console.log('🍪 Session aus iOS Safari Cookie wiederhergestellt');
                            return {
                                user: {
                                    spotifyUsername: decoded.user,
                                    isAuthenticated: true,
                                    spotifyConnected: true
                                },
                                expires: Date.now() + (30 * 24 * 60 * 60 * 1000),
                                created: decoded.time || Date.now(),
                                lastActivity: Date.now()
                            };
                        }
                    }
                }
            } catch (error) {
                console.warn('🍪 Cookie-Fallback fehlgeschlagen:', error);
            }
        }
        
        console.log('❌ Keine gültige Session gefunden');
        return null;
    }
    
    /**
     * Beschädigte Session-Daten bereinigen
     */
    cleanupCorruptedSession(key) {
        try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        } catch (error) {
            console.warn('Cleanup für ' + key + ' fehlgeschlagen');
        }
    }
    
    /**
     * Safari-Erkennung
     */
    isSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
               /iPad|iPhone|iPod/.test(navigator.userAgent);
    }
    
    /**
     * Browser-Erkennung für Debug-Zwecke
     */
    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    /**
     * Prüft ob lokale Session noch gültig ist
     */
    isSessionValid(session) {
        if (!session || !session.expires) return false;
        
        // Session über CONFIG-Datei konfigurierbare Dauer (Standard: 30 Tage)
        const sessionDuration = window.CONFIG?.SESSION_DURATION || (30 * 24 * 60 * 60 * 1000);
        const isValid = session.expires > Date.now();
        
        if (isValid) {
            // Bei Aktivität Session-Gültigkeit verlängern
            this.updateSessionActivity(session);
        }
        
        return isValid;
    }

    /**
     * Session-Aktivität aktualisieren (verlängert automatisch)
     */
    updateSessionActivity(session) {
        const now = Date.now();
        const sessionDuration = window.CONFIG?.SESSION_DURATION || (30 * 24 * 60 * 60 * 1000);
        
        // Nur alle 24h aktualisieren um localStorage-Calls zu minimieren
        if (!session.lastActivity || (now - session.lastActivity) > (24 * 60 * 60 * 1000)) {
            session.lastActivity = now;
            session.expires = now + sessionDuration; // Verlängert um konfigurierte Dauer
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            
            const daysLeft = Math.round(sessionDuration / (24 * 60 * 60 * 1000));
            console.log(`🔄 Session automatisch verlängert um ${daysLeft} Tage`);
        }
    }

    /**
     * Session speichern (nach erfolgreichem Login) - Safari iOS optimiert
     */
    saveSession(userData) {
        const sessionDuration = window.CONFIG?.SESSION_DURATION || (30 * 24 * 60 * 60 * 1000);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        const session = {
            user: userData,
            expires: Date.now() + sessionDuration,
            created: Date.now(),
            lastActivity: Date.now(),
            browser: this.detectBrowser(),
            isIOS: isIOS,
            safariVersion: this.getSafariVersion()
        };
        
        console.log('💾 Speichere Session für', this.detectBrowser(), session);
        
        // Multi-Level Speicherung für Safari iOS
        const storageKeys = [
            this.sessionKey,
            this.sessionKey + '_safari',
            this.sessionKey + '_ios',
            'spotify_session_backup'
        ];
        
        let successCount = 0;
        
        // localStorage Versuche
        storageKeys.forEach(key => {
            try {
                localStorage.setItem(key, JSON.stringify(session));
                successCount++;
                console.log(`✅ Session gespeichert in localStorage[${key}]`);
            } catch (error) {
                console.warn(`⚠️ localStorage[${key}] fehlgeschlagen:`, error.name);
            }
        });
        
        // sessionStorage Versuche (iOS Fallback)
        storageKeys.forEach(key => {
            try {
                sessionStorage.setItem(key, JSON.stringify(session));
                successCount++;
                console.log(`✅ Session gespeichert in sessionStorage[${key}]`);
            } catch (error) {
                console.warn(`⚠️ sessionStorage[${key}] fehlgeschlagen:`, error.name);
            }
        });
        
        // Cookie Fallback für Safari iOS
        if (this.isSafari() && isIOS) {
            try {
                const cookieValue = btoa(JSON.stringify({
                    user: userData.spotifyUsername || 'user',
                    auth: true,
                    time: Date.now()
                }));
                document.cookie = `cueup_auth=${cookieValue}; path=/; max-age=${sessionDuration/1000}; SameSite=Lax`;
                console.log('🍪 iOS Safari Cookie-Fallback gesetzt');
                successCount++;
            } catch (error) {
                console.warn('🍪 Cookie-Fallback fehlgeschlagen:', error);
            }
        }
        
        console.log(`💾 Session-Speicherung: ${successCount} von ${storageKeys.length * 2 + (isIOS ? 1 : 0)} Methoden erfolgreich`);
        
        this.isAuthenticated = true;
        this.user = userData;
        this.updateUI();
    }
    
    /**
     * Safari-Version ermitteln für Debug-Zwecke
     */
    getSafariVersion() {
        const match = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
        return match ? match[1] : 'unknown';
    }
        
        const daysLeft = Math.round(sessionDuration / (24 * 60 * 60 * 1000));
        console.log(`✅ Session gespeichert für ${daysLeft} Tage (bis Browser-Cache gelöscht wird)`);
    }

    /**
     * SOFORTIGER Seiten-Schutz ohne Server-Call
     */
    protectPage() {
        if (!this.isAuthenticated) {
            // Sofort zur Login-Seite - keine Wartezeiten
            window.location.href = 'free.html';
            return false;
        }
        return true;
    }

    /**
     * SOFORTIGE Action-Prüfung
     */
    requireAuth(callback) {
        if (this.isAuthenticated) {
            callback();
        } else {
            window.location.href = 'free.html';
        }
    }

    /**
     * Login-Prozess
     */
    async login(credentials) {
        try {
            const response = await fetch('https://cueup-project.onrender.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(credentials)
            });

            if (response.ok) {
                const userData = await response.json();
                this.saveSession(userData);
                return { success: true, user: userData };
            }
            
            return { success: false, message: 'Login fehlgeschlagen' };
        } catch (error) {
            return { success: false, message: 'Verbindungsfehler' };
        }
    }

    /**
     * Spotify-Login
     */
    spotifyLogin() {
        const loginUrl = window.ENDPOINTS?.LOGIN || 'https://cueup-project.onrender.com/login';
        window.location.href = loginUrl;
    }

    /**
     * Logout - vollständig und zuverlässig
     */
    async logout() {
        console.log('🚪 Logout gestartet...');
        
        // 1. KOMPLETT alle Auth-Daten löschen (verschiedene Varianten für Robustheit)
        const keysToRemove = [this.sessionKey, 'cueup_session', 'spotify_session', 'user_session'];
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        this.isAuthenticated = false;
        this.user = null;
        
        // 2. Browser-Cookies löschen (falls vorhanden)
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        try {
            // 3. Server-Session löschen (mit mehreren Versuchen)
            const logoutUrls = [
                window.ENDPOINTS?.LOGOUT || 'https://cueup-project.onrender.com/logout',
                window.ENDPOINTS?.AUTH_STATUS?.replace('/auth/status', '/auth/logout') || 'https://cueup-project.onrender.com/auth/logout'
            ];
            
            for (const url of logoutUrls) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        credentials: 'include',
                        signal: AbortSignal.timeout(2000)
                    });
                    console.log(`Server-Logout ${url}: ${response.status}`);
                } catch (e) {
                    console.log(`Server-Logout ${url} fehlgeschlagen:`, e.name);
                }
            }
        } catch (error) {
            console.log('🌐 Server-Logout komplett fehlgeschlagen, aber lokale Session gelöscht');
        }
        
        // 4. UI sofort aktualisieren
        this.updateUI();
        
        // 5. Zur Login-Seite mit Cache-Busting und force Parameter
        console.log('🔄 Weiterleitung zu Login-Seite...');
        const timestamp = Date.now();
        window.location.href = `free.html?force=1&logout=${timestamp}`;
    }

    /**
     * UI aktualisieren basierend auf Auth-Status
     */
    updateUI() {
        // Navigation aktualisieren
        this.updateNavigation();
        
        // Auth-abhängige Elemente anzeigen/verstecken
        const loggedInElements = document.querySelectorAll('.logged-in-only');
        const loggedOutElements = document.querySelectorAll('.logged-out-only');
        
        if (this.isAuthenticated) {
            loggedInElements.forEach(el => el.style.display = 'block');
            loggedOutElements.forEach(el => el.style.display = 'none');
        } else {
            loggedInElements.forEach(el => el.style.display = 'none');
            loggedOutElements.forEach(el => el.style.display = 'block');
        }
    }

    /**
     * Navigation basierend auf Auth-Status
     */
    updateNavigation() {
        const nav = document.getElementById('navigationMenu');
        if (!nav) return;

        let menuItems;
        
        if (this.isAuthenticated) {
            menuItems = [
                { text: 'Startseite', href: 'startpage.html' },
                { text: 'Event erstellen', href: 'createevent.html' },
                { text: 'Meine Events', href: 'myEvents.html' },
                { text: 'Profil', href: 'profile.html' },
                { text: 'Kontakt', href: 'contact.html' },
                { text: 'Ausloggen', href: '#', onclick: 'auth.logout()' }
            ];
        } else {
            menuItems = [
                { text: 'Startseite', href: 'startpage.html' },
                { text: 'Kontakt', href: 'contact.html' },
                { text: 'Einloggen', href: 'free.html' }
            ];
        }

        nav.innerHTML = menuItems.map(item => 
            `<li><a href="${item.href}"${item.onclick ? ` onclick="${item.onclick}; return false;"` : ''}>${item.text}</a></li>`
        ).join('');
    }

    /**
     * Server-Sync im Hintergrund (non-blocking) - robuste Multi-URL-Behandlung
     */
    async syncWithServerInBackground() {
        try {
            // Mehrere Auth-Check URLs versuchen (mit CONFIG-Integration)
            const authUrls = [
                window.ENDPOINTS?.AUTH_STATUS || 'https://cueup-project.onrender.com/auth/status',
                (window.ENDPOINTS?.AUTH_STATUS || 'https://cueup-project.onrender.com').replace('/auth/status', '/check-auth'),
                (window.ENDPOINTS?.AUTH_STATUS || 'https://cueup-project.onrender.com').replace('/auth/status', '/api/auth')
            ];
            
            let lastError = null;
            
            for (const url of authUrls) {
                try {
                    const response = await fetch(url, {
                        credentials: 'include',
                        signal: AbortSignal.timeout(3000)
                    });
                    
                    if (response.status === 308 || response.status === 301) {
                        // Redirect - Server ist da, aber Route falsch
                        console.log(`🔄 Server Redirect von ${url} - versuche nächste Route`);
                        continue;
                    }
                    
                    if (!response.ok) {
                        if (response.status === 401 || response.status === 403) {
                            console.log('🔒 Server-Auth invalid - Session nach Server-Restart ungültig');
                            // SILENT logout nur bei wiederholten 401-Fehlern (Server-Restart-Schutz)
                            const retryCount = parseInt(localStorage.getItem('auth_retry_count') || '0');
                            if (retryCount > 2) {
                                console.log('💀 Mehrfache Auth-Fehler - lokale Session entfernt');
                                localStorage.removeItem(this.sessionKey);
                                localStorage.removeItem('auth_retry_count');
                                this.isAuthenticated = false;
                                this.user = null;
                                this.updateUI();
                            } else {
                                localStorage.setItem('auth_retry_count', (retryCount + 1).toString());
                                console.log(`⏳ Auth-Retry ${retryCount + 1}/3 - Session bleibt erstmal erhalten`);
                            }
                            return;
                        } else {
                            console.log(`⚠️ Server-Fehler ${response.status} von ${url} - versuche nächste Route`);
                            continue;
                        }
                    } else {
                        // Success!
                        localStorage.removeItem('auth_retry_count');
                        const data = await response.json();
                        if (data.isAuthenticated && data.user) {
                            this.user = data.user;
                            console.log('✅ Server-Session gültig und lokale Daten aktualisiert');
                        } else {
                            console.log('✅ Server-Session gültig');
                        }
                        return; // Erfolgreich, stoppe hier
                    }
                } catch (error) {
                    lastError = error;
                    console.log(`🌐 ${url} nicht erreichbar:`, error.name);
                    continue;
                }
            }
            
            // Alle URLs fehlgeschlagen - aber Session NICHT löschen
            console.log('🌐 Alle Server-URLs nicht erreichbar - Session bleibt erhalten (Offline-Modus)');
            
        } catch (error) {
            console.log('🌐 Server-Sync komplett fehlgeschlagen - Session bleibt erhalten:', error.name);
        }
    }
}

// Globale Instanz erstellen
const auth = new ModernAuth();

// Kompatibilitäts-Funktionen für bestehenden Code
function protectThisPage() {
    return auth.protectPage();
}

function requireLogin(callback) {
    return auth.requireAuth(callback);
}

function logout() {
    auth.logout();
}

function checkLoginForAction(callback) {
    return auth.requireAuth(callback);
}

function requireLoginForAction(callback) {
    return auth.requireAuth(callback);
}

// Zusätzliche Funktionen für Problemlösung
function forceLogout() {
    // Komplett-Reset für hartnäckige Fälle
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('🧹 Komplett-Reset durchgeführt');
    window.location.href = 'free.html?force=1&reset=' + Date.now();
}

function extendSession() {
    // Session manuell um 1 Jahr verlängern
    const session = auth.getStoredSession();
    if (session) {
        session.expires = Date.now() + (365 * 24 * 60 * 60 * 1000);
        localStorage.setItem(auth.sessionKey, JSON.stringify(session));
        console.log('🔄 Session manuell um 1 Jahr verlängert');
    }
}

// Auto-Navigation nach DOM-Load
document.addEventListener('DOMContentLoaded', () => {
    auth.updateUI();
});