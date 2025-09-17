/**
 * Globale Server-Status-Laufschrift
 * Zeigt orange Laufschrift unter Footer wenn Server startet
 * Basiert auf Beta-Banner CSS Design
 */

class ServerStatusBanner {
    constructor() {
        this.isVisible = false;
        this.statusInterval = null;
        this.banner = null;
        this.checkInterval = 15000; // Alle 15 Sekunden prüfen
        this.init();
    }

    init() {
        this.createBanner();
        this.startStatusCheck();
        console.log('🏁 Server-Status-Banner initialisiert');
    }

    createBanner() {
        // Banner HTML erstellen
        this.banner = document.createElement('div');
        this.banner.className = 'server-status-banner';
        this.banner.innerHTML = `
            <div class="status-ticker">
                🟡 Server startet gerade... Bitte haben Sie einen Moment Geduld 🟡
            </div>
        `;

        // Banner CSS hinzufügen
        const style = document.createElement('style');
        style.textContent = `
            .server-status-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(90deg, #ff8c00, #ffa500, #ff8c00);
                color: white;
                font-weight: bold;
                font-size: 0.85rem;
                padding: 8px 0;
                border-top: 2px solid rgba(255, 140, 0, 0.3);
                overflow: hidden;
                white-space: nowrap;
                box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
                z-index: 10000;
                display: none;
                pointer-events: none;
            }
            
            .status-ticker {
                display: inline-block;
                animation: scroll-status-ticker 20s linear infinite;
                pointer-events: none;
            }
            
            .server-status-banner:hover .status-ticker,
            .server-status-banner:active .status-ticker,
            .status-ticker:hover,
            .status-ticker:active {
                animation-play-state: running !important;
            }
            
            @keyframes scroll-status-ticker {
                from {
                    transform: translateX(100vw);
                }
                to {
                    transform: translateX(-100%);
                }
            }

            /* Body Padding wenn Banner sichtbar */
            body.server-status-visible {
                padding-bottom: 40px;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.banner);
    }

    async checkServerStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${window.CONFIG?.BACKEND_URL || 'https://cueup-project.onrender.com'}/auth/status`, {
                credentials: 'include',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                // Server läuft - Banner ausblenden
                this.hideBanner();
                console.log('✅ Server läuft - Status-Banner versteckt');
            } else {
                // Server Probleme - Banner anzeigen
                this.showBanner();
                console.log('🟡 Server-Probleme erkannt - Status-Banner angezeigt');
            }

        } catch (error) {
            // Fetch-Fehler bedeutet Server startet wahrscheinlich
            if (error.name === 'AbortError') {
                console.log('⏱️ Server-Status-Check Timeout - Banner anzeigen');
            } else {
                console.log('🟡 Server nicht erreichbar - Banner anzeigen:', error.message);
            }
            this.showBanner();
        }
    }

    showBanner() {
        if (!this.isVisible) {
            this.banner.style.display = 'block';
            document.body.classList.add('server-status-visible');
            this.isVisible = true;
            console.log('📢 Server-Status-Banner angezeigt');
        }
    }

    hideBanner() {
        if (this.isVisible) {
            this.banner.style.display = 'none';
            document.body.classList.remove('server-status-visible');
            this.isVisible = false;
            console.log('✅ Server-Status-Banner versteckt');
        }
    }

    startStatusCheck() {
        // Sofortiger Check
        this.checkServerStatus();
        
        // Regelmäßige Checks
        this.statusInterval = setInterval(() => {
            this.checkServerStatus();
        }, this.checkInterval);
    }

    stopStatusCheck() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
            console.log('⏹️ Server-Status-Checks gestoppt');
        }
    }

    // Cleanup für Seitenwechsel
    destroy() {
        this.stopStatusCheck();
        if (this.banner) {
            this.banner.remove();
        }
        document.body.classList.remove('server-status-visible');
    }
}

// Dashboard Keep-Alive System
class DashboardKeepAlive {
    constructor() {
        this.pingInterval = null;
        this.pingDelay = 4 * 60 * 1000; // Alle 4 Minuten (Render schläft nach 15min)
        this.isActive = false;
    }

    startKeepAlive() {
        if (this.isActive) return;
        
        console.log('🔄 Dashboard Keep-Alive gestartet (Ping alle 4 Minuten)');
        
        // Sofortiger Ping
        this.sendPing();
        
        // Regelmäßige Pings
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, this.pingDelay);
        
        this.isActive = true;
    }

    async sendPing() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(`${window.CONFIG?.BACKEND_URL || 'https://cueup-project.onrender.com'}/auth/status`, {
                credentials: 'include',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('📡 Keep-Alive Ping erfolgreich');
            } else {
                console.log('⚠️ Keep-Alive Ping: Server antwortet mit Fehler');
            }
        } catch (error) {
            console.log('❌ Keep-Alive Ping fehlgeschlagen:', error.message);
        }
    }

    stopKeepAlive() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
            this.isActive = false;
            console.log('⏹️ Dashboard Keep-Alive gestoppt');
        }
    }
}

// Global verfügbar machen
window.ServerStatusBanner = ServerStatusBanner;
window.DashboardKeepAlive = DashboardKeepAlive;

// Auto-initialisierung für alle Seiten (außer explizit ausgeschlossen)
document.addEventListener('DOMContentLoaded', () => {
    // Server-Status-Banner für alle Seiten
    window.serverStatusBanner = new ServerStatusBanner();
    
    // Keep-Alive nur für Dashboard
    if (window.location.pathname.includes('dashboard') || document.title.includes('Dashboard')) {
        window.dashboardKeepAlive = new DashboardKeepAlive();
        window.dashboardKeepAlive.startKeepAlive();
        console.log('🎛️ Dashboard Keep-Alive aktiviert');
    }
});

// Cleanup bei Seitenwechsel
window.addEventListener('beforeunload', () => {
    if (window.serverStatusBanner) {
        window.serverStatusBanner.destroy();
    }
    if (window.dashboardKeepAlive) {
        window.dashboardKeepAlive.stopKeepAlive();
    }
});