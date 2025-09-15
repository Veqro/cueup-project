const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

// Statische Dateien bereitstellen
app.use(express.static(__dirname));

// ============ URL REWRITING FÜR SAUBERE URLs ============
const pageRoutes = [
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
    'spotify-success',
    'free',
    'debug'
];

// Route für jede HTML-Seite ohne .html Endung
pageRoutes.forEach(route => {
    app.get(`/${route}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${route}.html`));
    });
});

// Root-Route zur Startpage
app.get('/', (req, res) => {
    res.redirect('/startpage');
});

// Fallback für alle anderen Routen
app.get('/*', (req, res) => {
    res.status(404).send(`
        <html>
        <head><title>404 - Seite nicht gefunden</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>404 - Seite nicht gefunden</h1>
            <p>Die angeforderte Seite existiert nicht.</p>
            <a href="/startpage" style="color: #aa00ff;">Zur Startseite</a>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 CueUp Frontend Server läuft auf Port ${PORT}`);
    console.log(`📱 Öffne im Browser: http://localhost:${PORT}/startpage`);
    console.log(`✨ Saubere URLs aktiviert - keine .html Endungen!`);
    console.log('');
    console.log('Verfügbare URLs:');
    pageRoutes.forEach(route => {
        console.log(`   http://localhost:${PORT}/${route}`);
    });
});