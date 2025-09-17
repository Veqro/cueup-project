/**
 * Zentrale Konfiguration für Backend-URLs
 * Diese Datei enthält alle Server-Endpoints für einfache Wartung
 * 
 * WICHTIG: Nach Änderungen die Seite neu laden!
 */

// ============ HAUPTKONFIGURATION ============
const CONFIG = {
    // Backend Server URL - Hier einfach die URL ändern für neuen Server
    BACKEND_URL: 'https://cueup-project.onrender.com',
    
    // Frontend URL (normalerweise nicht ändern)
    FRONTEND_URL: 'https://cueup.vercel.app',
    
    // Timeout-Einstellungen
    REQUEST_TIMEOUT: 10000, // 10 Sekunden
    
    // Session-Einstellungen
    SESSION_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 Tage in Millisekunden
    
    // Auto-Retry Einstellungen
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000 // 1 Sekunde
};

// ============ ENDPOINT-KONFIGURATION ============
// Alle API-Endpoints basierend auf der Backend-URL
const ENDPOINTS = {
    // Authentication
    AUTH_STATUS: `${CONFIG.BACKEND_URL}/auth/status`,
    LOGIN: `${CONFIG.BACKEND_URL}/auth/login`,
    LOGOUT: `${CONFIG.BACKEND_URL}/auth/logout`,
    
    // Spotify Endpoints
    SPOTIFY_AUTH: `${CONFIG.BACKEND_URL}/auth/spotify`,
    SPOTIFY_CALLBACK: `${CONFIG.BACKEND_URL}/auth/spotify/callback`,
    SPOTIFY_ME: `${CONFIG.BACKEND_URL}/spotify/me`,
    SPOTIFY_PLAYLISTS: `${CONFIG.BACKEND_URL}/spotify/playlists`,
    SPOTIFY_ADD_TO_QUEUE: `${CONFIG.BACKEND_URL}/spotify/add-to-queue`,
    
    // API Endpoints
    API_EVENTS: `${CONFIG.BACKEND_URL}/api/events`,
    API_USERS: `${CONFIG.BACKEND_URL}/api/users`,
    API_WISHES: `${CONFIG.BACKEND_URL}/api/wishes`,
    
    // WebSocket
    WEBSOCKET: `${CONFIG.BACKEND_URL.replace('https://', 'wss://')}/ws`,
    
    // Health Check
    HEALTH: `${CONFIG.BACKEND_URL}/health`,
    
    // Event Management
    CREATE_EVENT: `${CONFIG.BACKEND_URL}/api/events`,
    GET_EVENT: (eventId) => `${CONFIG.BACKEND_URL}/api/events/${eventId}`,
    DELETE_EVENT: (eventId) => `${CONFIG.BACKEND_URL}/api/events/${eventId}`,
    
    // User Management
    UPDATE_PROFILE: `${CONFIG.BACKEND_URL}/api/users/profile`,
    USER_EVENTS: `${CONFIG.BACKEND_URL}/api/users/events`,
    
    // Wishes Management
    ADD_WISH: `${CONFIG.BACKEND_URL}/api/wishes`,
    GET_WISHES: (eventId) => `${CONFIG.BACKEND_URL}/api/wishes/${eventId}`,
    DELETE_WISH: (wishId) => `${CONFIG.BACKEND_URL}/api/wishes/${wishId}`
};

// ============ HILFSFUNKTIONEN ============
/**
 * Erstellt eine Fetch-Anfrage mit Standard-Optionen
 */
function createFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        timeout: CONFIG.REQUEST_TIMEOUT,
        ...options
    };
    
    return fetch(url, defaultOptions);
}

/**
 * Prüft ob der Server erreichbar ist
 */
async function pingServer() {
    try {
        const response = await createFetch(ENDPOINTS.HEALTH);
        return response.ok;
    } catch (error) {
        console.warn('Server ping failed:', error.message);
        return false;
    }
}

/**
 * Debug-Informationen für die Konsole
 */
function logConfig() {
    console.log('🔧 Backend-Konfiguration:');
    console.log('📡 Backend URL:', CONFIG.BACKEND_URL);
    console.log('🌐 Frontend URL:', CONFIG.FRONTEND_URL);
    console.log('⏱️ Session Duration:', CONFIG.SESSION_DURATION / (24 * 60 * 60 * 1000), 'Tage');
    console.log('🔄 Max Retries:', CONFIG.MAX_RETRIES);
}

// ============ EXPORT FÜR GLOBALE NUTZUNG ============
// Mache Konfiguration global verfügbar
window.CONFIG = CONFIG;
window.ENDPOINTS = ENDPOINTS;
window.createFetch = createFetch;
window.pingServer = pingServer;

// Lade-Bestätigung
console.log('✅ Backend-Konfiguration geladen!');
if (window.location.pathname.includes('debug.html')) {
    logConfig();
}