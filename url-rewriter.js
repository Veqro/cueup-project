// URL Rewriter für saubere URLs im Frontend (Live Server)
(function() {
    'use strict';
    
    console.log('🔄 URL-Rewriter gestartet...');
    
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
                const url = new URL(link.href);
                
                // Nur für interne Links auf derselben Domain
                if (url.origin === window.location.origin && url.pathname.endsWith('.html')) {
                    e.preventDefault();
                    
                    const cleanPath = url.pathname.replace('.html', '');
                    const newUrl = url.origin + cleanPath + url.search + url.hash;
                    
                    console.log('🔗 Navigation:', url.pathname, '→', cleanPath);
                    
                    // Navigiere zur .html Datei, aber zeige saubere URL
                    window.location.href = url.pathname + url.search + url.hash;
                }
            }
        });
    }
    
    // Initialisierung
    function init() {
        console.log('🟢 URL-Rewriter initialisiert');
        handleCleanUrls();
        hideHtmlExtension();
        setupCleanNavigation();
    }
    
    // Warte auf DOM-Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Für Seitenübergänge
    window.addEventListener('load', function() {
        hideHtmlExtension();
    });
})();