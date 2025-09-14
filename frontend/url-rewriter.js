// URL Rewriter für saubere URLs im Frontend (Live Server)
(function() {
    'use strict';
    
    console.log('🔄 URL-Rewriter gestartet...');
    
    // VERCEL-MODUS ERKENNEN: Wenn wir auf Vercel sind, nichts tun
    if (window.location.hostname === 'cueup.vercel.app' || 
        window.location.hostname.endsWith('.vercel.app')) {
        console.log('🔄 Vercel-Umgebung erkannt - URL-Rewriter deaktiviert');
        return; // Script beenden, Vercel übernimmt das URL-Management
    }
    
    // Liste aller verfügbaren Seiten
    const pages = [
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
        'free'
    ];
    
    // Funktion zum Verstecken der .html Endung in der URL
    function hideHtmlExtension() {
        const currentPath = window.location.pathname;
        
        if (currentPath.endsWith('.html')) {
            const cleanPath = currentPath.replace('.html', '');
            const newUrl = window.location.origin + cleanPath + window.location.search + window.location.hash;
            
            console.log('🔄 URL gekürzt:', currentPath, '→', cleanPath);
            
            // Ersetze die URL ohne Seite neu zu laden
            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, newUrl);
            }
        }
    }
    
    // Funktion zum Umleiten von sauberen URLs zu .html Dateien
    // NUR FÜR LOKALE ENTWICKLUNG
    function handleCleanUrls() {
        const path = window.location.pathname;
        const cleanPath = path.replace(/^\//, '').replace(/\/$/, ''); // Entferne Slashes
        
        // Prüfen ob es eine saubere URL ist, die zu einer .html Datei führen soll
        if (pages.includes(cleanPath) && !path.endsWith('.html')) {
            const targetFile = cleanPath + '.html';
            console.log('🔄 Lade .html Datei:', cleanPath, '→', targetFile);
            
            // Weiterleitung zur .html Datei
            window.location.replace(targetFile + window.location.search + window.location.hash);
            return;
        }
    }
    
    // Event Listener für saubere Navigation bei Link-Klicks
    function setupCleanNavigation() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href) {
                try {
                    const url = new URL(link.href);
                    
                    // Nur für interne Links auf derselben Domain
                    if (url.origin === window.location.origin && url.pathname.endsWith('.html')) {
                        e.preventDefault();
                        
                        const cleanPath = url.pathname.replace('.html', '');
                        const newUrl = url.origin + cleanPath + url.search + url.hash;
                        
                        console.log('🔗 Navigation:', url.pathname, '→', cleanPath);
                        
                        // Vermeidet Rekursion durch Flag im Session Storage
                        sessionStorage.setItem('navigatingTo', url.pathname);
                        
                        // Navigiere zur .html Datei, aber zeige saubere URL
                        window.location.href = url.pathname + url.search + url.hash;
                    }
                } catch (error) {
                    console.error('Fehler bei der Navigation:', error);
                    // Bei Fehler: Standard-Navigation verwenden
                }
            }
        });
    }
    
    // Überprüfen, ob wir bereits in einer Endlosschleife stecken
    function isReloadLoop() {
        const reloadCount = parseInt(sessionStorage.getItem('reloadCount') || '0');
        
        if (reloadCount > 3) {
            console.error('⚠️ Endlosschleife erkannt! URL-Rewriter wird deaktiviert.');
            sessionStorage.removeItem('reloadCount');
            return true;
        }
        
        sessionStorage.setItem('reloadCount', (reloadCount + 1).toString());
        return false;
    }
    
    // Initialisierung
    function init() {
        console.log('🟢 URL-Rewriter initialisiert');
        
        // Endlosschleife erkennen und vermeiden
        if (isReloadLoop()) return;
        
        // Prüfen ob wir gerade von einer Umleitung kommen
        const lastNavigation = sessionStorage.getItem('navigatingTo');
        if (lastNavigation) {
            // Umleitung abgeschlossen, Flag entfernen
            sessionStorage.removeItem('navigatingTo');
            
            // Nur hideHtmlExtension aufrufen, nicht handleCleanUrls
            hideHtmlExtension();
        } else {
            // Normale Initialisierung
            handleCleanUrls();
            hideHtmlExtension();
        }
        
        setupCleanNavigation();
        
        // Nach 2 Sekunden ReloadCount zurücksetzen
        setTimeout(() => {
            sessionStorage.removeItem('reloadCount');
        }, 2000);
    }
    
    // Warte auf DOM-Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Für Seitenübergänge
    window.addEventListener('load', function() {
        if (!isReloadLoop()) {
            hideHtmlExtension();
        }
    });
})();