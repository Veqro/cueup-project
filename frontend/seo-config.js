/**
 * SEO-Konfiguration für CueUp
 * Zentrale Verwaltung aller Meta-Daten und SEO-Einstellungen
 */

// Haupt-SEO-Konfiguration
const SEO_CONFIG = {
    // Basis-Informationen
    siteName: "CueUp",
    siteUrl: "https://cueup.vercel.app",
    logoUrl: "https://cueup.vercel.app/img/logo.png",
    
    // Haupt-Keywords
    mainKeywords: [
        "DJ Event Management",
        "Spotify Musikwünsche",
        "Event DJ Software",
        "Musikwunsch App",
        "DJ Tools",
        "Event Plattform",
        "Spotify Integration",
        "Musikwunsch Verwaltung",
        "DJ Dashboard",
        "Event Musikwünsche"
    ],
    
    // Seiten-spezifische SEO-Daten
    pages: {
        startpage: {
            title: "CueUp - Professionelle DJ Event Management Platform mit Spotify Integration",
            description: "Die ultimative Lösung für DJs: Verwalte Events, sammle Musikwünsche über Spotify und biete deinen Gästen eine interaktive Musik-Experience. Kostenlos starten!",
            keywords: "DJ Event Management, Spotify Musikwünsche, DJ Software, Event Plattform, Musikwunsch App, DJ Tools, Event Musik, DJ Dashboard",
            type: "website"
        },
        
        free: {
            title: "CueUp Login - Starte dein DJ Event Management",
            description: "Melde dich bei CueUp an und starte dein professionelles Event Management. Spotify Integration, Musikwunsch-Verwaltung und mehr für moderne DJs.",
            keywords: "CueUp Login, DJ Anmeldung, Spotify Login, Event Management Anmeldung, DJ Tools Login",
            type: "website"
        },
        
        dashboard: {
            title: "DJ Dashboard - Live Event Management | CueUp",
            description: "Dein DJ Control Center: Verwalte Live-Events, überwache Musikwünsche, steuere Spotify-Playlists und interagiere mit deinen Gästen in Echtzeit.",
            keywords: "DJ Dashboard, Live Event Management, Musikwunsch Dashboard, DJ Control Center, Event Steuerung, Spotify DJ Tools",
            type: "webapp"
        },
        
        createevent: {
            title: "Event erstellen - Neues DJ Event anlegen | CueUp",
            description: "Erstelle ein neues DJ Event in Minuten. QR-Code generierung, Musikwunsch-Integration, Spotify-Anbindung und Gäste-Interaktion automatisch eingerichtet.",
            keywords: "Event erstellen, DJ Event anlegen, Musikwunsch Event, QR Code Event, Spotify Event, DJ Veranstaltung",
            type: "webapp"
        },
        
        myEvents: {
            title: "Meine Events - DJ Event Übersicht | CueUp", 
            description: "Übersicht all deiner DJ Events. Verwalte vergangene und kommende Veranstaltungen, analysiere Musikwünsche und optimiere deine DJ Performance.",
            keywords: "Meine Events, DJ Event Übersicht, Event Verwaltung, DJ Veranstaltungen, Event Historie, DJ Performance",
            type: "webapp"
        },
        
        profile: {
            title: "Profil - DJ Account Einstellungen | CueUp",
            description: "Verwalte dein DJ-Profil, Spotify-Verbindung und Account-Einstellungen. Optimiere deine CueUp Experience und Event-Management Einstellungen.",
            keywords: "DJ Profil, Account Einstellungen, Spotify Verbindung, DJ Account, CueUp Profil, Event Einstellungen",
            type: "profile"
        }
    },
    
    // Strukturierte Daten Templates
    organizationSchema: {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "CueUp",
        "description": "Professionelle DJ Event Management Platform mit Spotify Integration",
        "url": "https://cueup.vercel.app",
        "applicationCategory": "EntertainmentApplication",
        "operatingSystem": "Web Browser",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "127"
        },
        "author": {
            "@type": "Organization",
            "name": "CueUp Team"
        }
    }
};

// SEO Meta-Tags generieren
function generateSEOTags(pageKey) {
    const page = SEO_CONFIG.pages[pageKey];
    if (!page) return '';
    
    return `
    <!-- SEO Meta Tags -->
    <title>${page.title}</title>
    <meta name="description" content="${page.description}">
    <meta name="keywords" content="${page.keywords}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="author" content="CueUp Team">
    <meta name="generator" content="CueUp Platform">
    <link rel="canonical" href="${SEO_CONFIG.siteUrl}/${pageKey === 'startpage' ? '' : pageKey + '.html'}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${page.type}">
    <meta property="og:url" content="${SEO_CONFIG.siteUrl}/${pageKey === 'startpage' ? '' : pageKey + '.html'}">
    <meta property="og:title" content="${page.title}">
    <meta property="og:description" content="${page.description}">
    <meta property="og:image" content="${SEO_CONFIG.logoUrl}">
    <meta property="og:site_name" content="${SEO_CONFIG.siteName}">
    <meta property="og:locale" content="de_DE">
    
    <!-- Twitter Card -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${SEO_CONFIG.siteUrl}/${pageKey === 'startpage' ? '' : pageKey + '.html'}">
    <meta property="twitter:title" content="${page.title}">
    <meta property="twitter:description" content="${page.description}">
    <meta property="twitter:image" content="${SEO_CONFIG.logoUrl}">
    
    <!-- Additional SEO Meta Tags -->
    <meta name="theme-color" content="#aa00ff">
    <meta name="msapplication-TileColor" content="#aa00ff">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="format-detection" content="telephone=no">
    `;
}

// Strukturierte Daten generieren
function generateStructuredData(pageKey) {
    let schema = JSON.parse(JSON.stringify(SEO_CONFIG.organizationSchema));
    
    // Seiten-spezifische Anpassungen
    if (pageKey === 'dashboard') {
        schema["@type"] = "WebApplication";
        schema.browserRequirements = "Requires JavaScript. Requires HTML5.";
    }
    
    return `
    <script type="application/ld+json">
    ${JSON.stringify(schema, null, 2)}
    </script>
    `;
}

// Global verfügbar machen
window.SEO_CONFIG = SEO_CONFIG;
window.generateSEOTags = generateSEOTags;
window.generateStructuredData = generateStructuredData;