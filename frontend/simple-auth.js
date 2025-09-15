/**
 * 🔐 CueUp Simple Auth - Einfaches lokales Authentifizierungssystem
 * Keine ständigen API-Calls, sondern lokale Session-Verwaltung
 */

class SimpleAuth {
    constructor() {
        this.isLoggedIn = false;
        this.userInfo = null;
        this.lastCheck = 0;
        this.checkInterval = 5 * 60 * 1000; // 5 Minuten
        
        // Sofort beim Laden prüfen
        this.initAuth();
    }

    /**
     * Initialisiert das Auth-System beim Seitenladen - SOFORT ohne Server-Call
     */
    async initAuth() {
        // Erstmal aus localStorage prüfen (SOFORT)
        const stored = localStorage.getItem('cueup_auth');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.expires > Date.now()) {
                    this.isLoggedIn = true;
                    this.userInfo = data.user;
                    return true;
                }
            } catch (e) {
                localStorage.removeItem('cueup_auth');
            }
        }

        // Wenn lokale Session abgelaufen -> optimistisch annehmen dass nicht eingeloggt
        // Server-Check im Hintergrund ohne zu warten
        this.checkServerAuthBackground();
        
        this.isLoggedIn = false;
        return false;
    }

    /**
     * Hintergrund-Server-Check ohne Wartezeit
     */
    checkServerAuthBackground() {
        // Läuft im Hintergrund, blockiert nichts
        setTimeout(async () => {
            try {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 500);

                const response = await fetch('https://novel-willyt-veqro-a29cd625.koyeb.app/auth/status', {
                    credentials: 'include',
                    signal: controller.signal,
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.isAuthenticated) {
                        this.setLocalAuth(data);
                        this.isLoggedIn = true;
                        this.userInfo = data.user;
                    }
                }
            } catch (error) {
                // Ignoriere Fehler - läuft ja im Hintergrund
            }
        }, 50); // Minimale Verzögerung um nicht zu blockieren
    }

    /**
     * Sofortiger Server-Check nur für kritische Aktionen
     */
    async checkServerAuth() {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 500);

            const response = await fetch('https://novel-willyt-veqro-a29cd625.koyeb.app/auth/status', {
                credentials: 'include',
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.isAuthenticated) {
                    this.setLocalAuth(data);
                    return true;
                } else {
                    this.clearLocalAuth();
                    return false;
                }
            }
        } catch (error) {
            // Bei Fehlern: Falls lokale Session vorhanden, die nutzen
            const stored = localStorage.getItem('cueup_auth');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    if (data.expires > Date.now()) {
                        this.isLoggedIn = true;
                        this.userInfo = data.user;
                        return true;
                    }
                } catch (e) {}
            }
        }

        this.clearLocalAuth();
        return false;
    }

    /**
     * Setzt lokale Auth-Daten
     */
    setLocalAuth(authData) {
        this.isLoggedIn = true;
        this.userInfo = authData.user || { username: authData.username || 'User' };
        
        // 30 Minuten lokal gültig (länger für weniger Server-Calls)
        const expires = Date.now() + (30 * 60 * 1000);
        localStorage.setItem('cueup_auth', JSON.stringify({
            user: this.userInfo,
            expires: expires,
            timestamp: Date.now()
        }));
    }

    /**
     * Löscht lokale Auth-Daten
     */
    clearLocalAuth() {
        this.isLoggedIn = false;
        this.userInfo = null;
        localStorage.removeItem('cueup_auth');
    }

    /**
     * SOFORTIGE Seiten-Schutz-Funktion - 0ms Wartezeit
     */
    async protectPage(redirectUrl = 'free.html') {
        // SOFORTIGE lokale Prüfung ohne Server-Call
        const stored = localStorage.getItem('cueup_auth');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.expires > Date.now()) {
                    this.isLoggedIn = true;
                    this.userInfo = data.user;
                    // Hintergrund-Refresh ohne zu warten
                    this.checkServerAuthBackground();
                    return true;
                }
            } catch (e) {
                localStorage.removeItem('cueup_auth');
            }
        }
        
        // Nicht eingeloggt - SOFORTIGE Weiterleitung
        const message = encodeURIComponent('Bitte zuerst einloggen!');
        window.location.replace(`${redirectUrl}?message=${message}`);
        return false;
    }

    /**
     * Logout-Funktion
     */
    async logout() {
        try {
            // Server-Logout
            await fetch('https://novel-willyt-veqro-a29cd625.koyeb.app/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.log('Server-Logout fehlgeschlagen, nur lokal ausloggen');
        }

        // Lokal ausloggen
        this.clearLocalAuth();
        
        // Zur Startseite weiterleiten
        window.location.href = 'startpage.html';
    }

    /**
     * SOFORTIGE Login-Prüfung für Buttons - 0ms Wartezeit
     */
    async checkLoginForAction() {
        // Nur lokale Prüfung - SOFORT
        const stored = localStorage.getItem('cueup_auth');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.expires > Date.now()) {
                    this.isLoggedIn = true;
                    this.userInfo = data.user;
                    return true;
                }
            } catch (e) {
                localStorage.removeItem('cueup_auth');
            }
        }
        return false;
    }

    /**
     * SOFORTIGE Login-Check mit Weiterleitung für Buttons
     */
    async requireLoginForAction(targetPage, actionName) {
        // SOFORTIGE lokale Prüfung
        const stored = localStorage.getItem('cueup_auth');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.expires > Date.now()) {
                    // SOFORT zur gewünschten Seite
                    window.location.href = `${targetPage}.html`;
                    return;
                }
            } catch (e) {
                localStorage.removeItem('cueup_auth');
            }
        }
        
        // Nicht eingeloggt - SOFORT zur Login-Seite
        const message = encodeURIComponent(`Für "${actionName}" musst du dich zuerst anmelden!`);
        window.location.href = `free.html?message=${message}`;
    }
}

// Globale Instanz erstellen
window.simpleAuth = new SimpleAuth();

/**
 * SOFORTIGE Hilfsfunktionen für HTML-Usage - 0ms Wartezeit
 */

// SOFORTIGER Seitenschutz (für script-tag in geschützten Seiten)
function protectThisPage() {
    // SOFORTIGE lokale Prüfung ohne Server-Call
    const stored = localStorage.getItem('cueup_auth');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            if (data.expires > Date.now()) {
                // Eingeloggt - Seite laden lassen + Hintergrund-Refresh
                window.simpleAuth.checkServerAuthBackground();
                return true;
            }
        } catch (e) {
            localStorage.removeItem('cueup_auth');
        }
    }
    
    // Nicht eingeloggt - SOFORTIGE Weiterleitung
    const message = encodeURIComponent('Bitte zuerst einloggen!');
    window.location.replace(`free.html?message=${message}`);
    return false;
}

// Logout (für Logout-Buttons)
function logout() {
    window.simpleAuth.logout();
}

// Login-Check für Event-Buttons (ersetzt checkLoginAndRedirect)
function checkLoginAndRedirect(targetPage, actionName) {
    window.simpleAuth.requireLoginForAction(targetPage, actionName);
}
