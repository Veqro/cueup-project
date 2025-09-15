/**
 * 🔐 CueUp Login Guard - Zentraler Login-Schutz für geschützte Seiten
 * Diese Datei schützt Seiten vor unbefugtem Zugriff und leitet zur Login-Seite weiter
 */

class LoginGuard {
    constructor(options = {}) {
        this.options = {
            redirectUrl: 'free.html',
            timeoutMs: 3000,
            showLoadingScreen: true,
            requiredMessage: 'Bitte zuerst einloggen!',
            ...options
        };
        
        this.isChecking = false;
        this.isAuthenticated = false;
    }

    /**
     * Überprüft den Login-Status und schützt die Seite
     */
    async protect() {
        if (this.isChecking) return;
        this.isChecking = true;

        // Loading-Screen anzeigen (optional)
        if (this.options.showLoadingScreen) {
            this.showLoadingScreen();
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

            const response = await fetch('https://novel-willyt-veqro-a29cd625.koyeb.app/auth/status', {
                credentials: 'include',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                
                if (data.isAuthenticated) {
                    // ✅ Benutzer ist eingeloggt
                    this.isAuthenticated = true;
                    this.onAuthSuccess(data);
                    this.hideLoadingScreen();
                    return true;
                } else {
                    // ❌ Benutzer ist nicht eingeloggt
                    this.redirectToLogin('Bitte zuerst einloggen!');
                    return false;
                }
            } else {
                // Server-Fehler
                console.warn('Auth-Status Check failed:', response.status);
                this.redirectToLogin('Sitzung abgelaufen - bitte erneut einloggen!');
                return false;
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Auth-Check Timeout - keine Internetverbindung?');
                this.redirectToLogin('Verbindungsfehler - bitte erneut versuchen!');
            } else {
                console.error('Auth-Check Error:', error);
                this.redirectToLogin('Fehler beim Laden - bitte erneut einloggen!');
            }
            return false;
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * Leitet zur Login-Seite mit Nachricht weiter
     */
    redirectToLogin(message = null) {
        const msg = message || this.options.requiredMessage;
        const encodedMessage = encodeURIComponent(msg);
        
        // Kleine Verzögerung für bessere UX
        setTimeout(() => {
            window.location.href = `${this.options.redirectUrl}?message=${encodedMessage}`;
        }, 200);
    }

    /**
     * Zeigt Loading-Screen während der Auth-Prüfung
     */
    showLoadingScreen() {
        // Überprüfe ob bereits vorhanden
        if (document.getElementById('loginGuardLoader')) return;

        const loader = document.createElement('div');
        loader.id = 'loginGuardLoader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                backdrop-filter: blur(5px);
            ">
                <div style="
                    text-align: center;
                    color: white;
                    font-family: 'Arial', sans-serif;
                ">
                    <div style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid rgba(170, 0, 255, 0.3);
                        border-top: 4px solid #aa00ff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px auto;
                    "></div>
                    <h3 style="margin: 0; color: #aa00ff;">Anmeldung wird überprüft...</h3>
                    <p style="margin: 10px 0 0 0; opacity: 0.8;">Einen Moment bitte</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(loader);
        
        // Fallback: Nach 5 Sekunden trotzdem weiterleiten
        setTimeout(() => {
            if (document.getElementById('loginGuardLoader') && !this.isAuthenticated) {
                this.redirectToLogin('Timeout - bitte erneut versuchen!');
            }
        }, 5000);
    }

    /**
     * Versteckt den Loading-Screen
     */
    hideLoadingScreen() {
        const loader = document.getElementById('loginGuardLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 300);
        }
    }

    /**
     * Callback bei erfolgreicher Authentifizierung
     */
    onAuthSuccess(userData) {
        console.log('✅ Login Guard: Benutzer authentifiziert', userData.spotifyUsername || 'Unbekannt');
        
        // Event für andere Scripts
        window.dispatchEvent(new CustomEvent('loginGuardSuccess', { 
            detail: userData 
        }));
    }

    /**
     * Statische Methode für schnelle Implementierung
     */
    static async quickProtect(options = {}) {
        const guard = new LoginGuard(options);
        return await guard.protect();
    }
}

// Auto-Start wenn Seite geladen wird (falls window.loginGuardAutoStart = true)
document.addEventListener('DOMContentLoaded', () => {
    if (window.loginGuardAutoStart === true) {
        LoginGuard.quickProtect();
    }
});

// Global verfügbar machen
window.LoginGuard = LoginGuard;