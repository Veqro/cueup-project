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
     * Session aus localStorage laden
     */
    getStoredSession() {
        try {
            const stored = localStorage.getItem(this.sessionKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            localStorage.removeItem(this.sessionKey);
            return null;
        }
    }

    /**
     * Prüft ob lokale Session noch gültig ist
     */
    isSessionValid(session) {
        if (!session || !session.expires) return false;
        
        // Session 7 Tage gültig (verlängert für bessere UX)
        return session.expires > Date.now();
    }

    /**
     * Session speichern (nach erfolgreichem Login)
     */
    saveSession(userData) {
        const session = {
            user: userData,
            expires: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 Tage
            created: Date.now()
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
        this.isAuthenticated = true;
        this.user = userData;
        this.updateUI();
        
        console.log('✅ Session gespeichert für 7 Tage');
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
            const response = await fetch('https://novel-willyt-veqro-a29cd625.koyeb.app/login', {
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
        window.location.href = 'https://novel-willyt-veqro-a29cd625.koyeb.app/login';
    }

    /**
     * Logout - sofort
     */
    logout() {
        // Lokale Session sofort löschen
        localStorage.removeItem(this.sessionKey);
        this.isAuthenticated = false;
        this.user = null;
        
        // Server-Logout im Hintergrund
        fetch('https://novel-willyt-veqro-a29cd625.koyeb.app/logout', {
            method: 'POST',
            credentials: 'include'
        }).catch(() => {}); // Ignore errors
        
        // Sofort zur Startseite
        window.location.href = 'startpage.html';
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
     * Server-Sync im Hintergrund (non-blocking)
     */
    async syncWithServerInBackground() {
        try {
            const response = await fetch('https://novel-willyt-veqro-a29cd625.koyeb.app/auth/status', {
                credentials: 'include',
                signal: AbortSignal.timeout(5000) // Max 5 Sekunden
            });

            if (!response.ok) {
                // Nur bei 401/403 ausloggen - andere Fehler ignorieren
                if (response.status === 401 || response.status === 403) {
                    console.log('🔒 Server-Auth invalid - lokale Session entfernt');
                    this.logout();
                } else {
                    console.log(`⚠️ Server-Fehler ${response.status} - Session bleibt erhalten`);
                }
            } else {
                console.log('✅ Server-Session gültig');
            }
        } catch (error) {
            // Bei Netzwerkfehlern NICHT ausloggen
            console.log('🌐 Server nicht erreichbar - Session bleibt erhalten:', error.name);
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

// Auto-Navigation nach DOM-Load
document.addEventListener('DOMContentLoaded', () => {
    auth.updateUI();
});