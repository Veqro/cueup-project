// CueUp Modern Auth - Emergency Repair Version
function ModernAuth() {
    this.isAuthenticated = false;
    this.user = null;
    this.sessionKey = 'cueup_session';
    this.init();
}

ModernAuth.prototype.init = function() {
    var session = this.getStoredSession();
    if (session && this.isSessionValid(session)) {
        this.isAuthenticated = true;
        this.user = session.user;
    }
    this.updateUI();
};

ModernAuth.prototype.getStoredSession = function() {
    try {
        var stored = localStorage.getItem(this.sessionKey);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn('Session parse error:', error);
    }
    return null;
};

ModernAuth.prototype.isSessionValid = function(session) {
    if (!session || !session.expires) return false;
    return session.expires > Date.now();
};

ModernAuth.prototype.saveSession = function(userData) {
    var session = {
        user: userData,
        expires: Date.now() + (30 * 24 * 60 * 60 * 1000),
        created: Date.now()
    };
    try {
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
        this.isAuthenticated = true;
        this.user = userData;
        this.updateUI();
    } catch (error) {
        console.warn('Session save error:', error);
    }
};

ModernAuth.prototype.protectPage = function() {
    if (!this.isAuthenticated) {
        window.location.href = 'free.html';
        return false;
    }
    return true;
};

ModernAuth.prototype.spotifyLogin = function() {
    window.location.href = 'https://cueup-project.onrender.com/login';
};

ModernAuth.prototype.logout = function() {
    localStorage.removeItem(this.sessionKey);
    this.isAuthenticated = false;
    this.user = null;
    window.location.href = 'free.html';
};

ModernAuth.prototype.updateUI = function() {
    this.updateNavigation();
    this.updateUserDisplay();
};

ModernAuth.prototype.updateNavigation = function() {
    var nav = document.getElementById('navigationMenu');
    if (!nav) return;

    var html = '';
    if (this.isAuthenticated && this.user) {
        html = '<li><a href="startpage.html">Startseite</a></li>' +
               '<li><a href="dashboard.html">Dashboard</a></li>' +
               '<li><a href="myEvents.html">Meine Events</a></li>' +
               '<li><a href="createevent.html">Event erstellen</a></li>' +
               '<li><a href="profile.html">Profil</a></li>' +
               '<li><a href="contact.html">Kontakt</a></li>' +
               '<li><a href="#" onclick="auth.logout(); return false;">Ausloggen</a></li>';
    } else {
        html = '<li><a href="startpage.html">Startseite</a></li>' +
               '<li><a href="contact.html">Kontakt</a></li>' +
               '<li><a href="free.html">Einloggen</a></li>';
    }
    nav.innerHTML = html;
};

ModernAuth.prototype.updateUserDisplay = function() {
    var userElements = ['username', 'spotifyUsername', 'currentUser'];
    for (var i = 0; i < userElements.length; i++) {
        var element = document.getElementById(userElements[i]);
        if (element) {
            element.textContent = this.user && this.user.spotifyUsername ? this.user.spotifyUsername : 'Nicht angemeldet';
        }
    }
};

// Global verfügbar machen
window.ModernAuth = ModernAuth;
window.auth = new ModernAuth();

document.addEventListener('DOMContentLoaded', function() {
    if (window.auth) {
        window.auth.updateUI();
    }
});
