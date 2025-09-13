// Verbesserte Event-Anzeige Funktion
function createEventHTML(event) {
    // Datum formatieren
    const eventDate = event.date ? new Date(event.date).toLocaleDateString("de-DE", {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'Nicht angegeben';

    // Event Name escapen für onclick-Handler
    const escapedName = (event.name || event.eventName || "Unbenanntes Event").replace(/'/g, "\\'");
    const eventCode = event.id || event.eventCode;

    return `
    <div class="event-card">
        <div class="event-header">
            <div>
                <h3 class="event-title">${event.name || event.eventName || "Unbenanntes Event"}</h3>
                <span class="event-code">#${eventCode}</span>
            </div>
            <button class="delete-btn" onclick="showDeleteConfirmation('${eventCode}', '${escapedName}')" title="Event löschen">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 5v6m4-6v6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
        
        <div class="event-info-grid">
            <div class="info-item">
                <div class="info-label">📅 Datum</div>
                <p class="info-value">${eventDate}</p>
            </div>
            <div class="info-item">
                <div class="info-label">🕐 Startzeit</div>
                <p class="info-value">${event.time || event.startTime || 'Nicht angegeben'}</p>
            </div>
            <div class="info-item">
                <div class="info-label">🕑 Endzeit</div>
                <p class="info-value">${event.endTime || 'Nicht angegeben'}</p>
            </div>
            <div class="info-item">
                <div class="info-label">📍 Location</div>
                <p class="info-value">${event.location || 'Nicht angegeben'}</p>
            </div>
            <div class="info-item">
                <div class="info-label">🎧 DJ</div>
                <p class="info-value">${event.dj || 'Nicht angegeben'}</p>
            </div>
            <div class="info-item">
                <div class="info-label">📊 Erstellt am</div>
                <p class="info-value">${event.createdAt ? new Date(event.createdAt).toLocaleDateString("de-DE") : 'Unbekannt'}</p>
            </div>
        </div>
        
        ${event.description ? `
            <div class="event-description">
                <div class="info-label">📝 Beschreibung</div>
                <p class="info-value">${event.description}</p>
            </div>
        ` : ''}
        
        <div class="event-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <div class="event-actions">
                <a href="dashboard.html?event=${eventCode}" class="dashboard-btn">
                    📊 Zum Dashboard
                </a>
                <button class="copy-btn" onclick="copyWishLink('${eventCode}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Musikwunsch-Link kopieren
                </button>
            </div>
        </div>
    </div>
    `;
}
