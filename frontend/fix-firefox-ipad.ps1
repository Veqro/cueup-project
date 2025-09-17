# Firefox & iPad Fixes für alle HTML-Dateien
# Repariert korrupte HTML-Struktur und fügt Fixes hinzu

$faviconBlock = @"
    <!-- Favicon Integration - Firefox-optimiert -->
    <!-- Standard ICO für alle Browser (Firefox bevorzugt) -->
    <link rel="icon" href="favicon_io/favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="favicon_io/favicon.ico" type="image/x-icon">
    
    <!-- PNG Favicons für moderne Browser -->
    <link rel="icon" type="image/png" sizes="16x16" href="favicon_io/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon_io/favicon-32x32.png">
    
    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" sizes="180x180" href="favicon_io/apple-touch-icon.png">
    
    <!-- Web App Manifest -->
    <link rel="manifest" href="favicon_io/site.webmanifest">
    
    <!-- Browser-spezifische Meta-Tags -->
    <meta name="msapplication-TileColor" content="#aa00ff">
    <meta name="theme-color" content="#aa00ff">
    
    <!-- Firefox-spezifischer Fallback -->
    <link rel="icon" href="favicon.ico" type="image/x-icon">
"@

Get-ChildItem -Path "c:\CueupV2" -Filter "*.html" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $updated = $false
    
    Write-Host "Bearbeite: $($_.Name)"
    
    # 1. Repariere korrupte stylesheet-Links
    if ($content -match 'rel="stylesheet"`n.*?href=') {
        $content = $content -replace 'rel="stylesheet"`n.*?`n.*?`n.*?href=', 'rel="stylesheet" href='
        Write-Host "  - Stylesheet-Link repariert"
        $updated = $true
    }
    
    # 2. Füge Favicon-Block hinzu falls nicht vorhanden
    if ($content -notmatch 'Firefox-optimiert') {
        # Suche nach einem guten Platz (nach config.js oder vor script src)
        if ($content -match '(<script src="config\.js"></script>)') {
            $content = $content -replace '(<script src="config\.js"></script>)', "`$1`n`n$faviconBlock"
            Write-Host "  - Favicon-Block nach config.js hinzugefügt"
            $updated = $true
        }
        elseif ($content -match '(<script src="modern-auth\.js"></script>)') {
            $content = $content -replace '(<script src="modern-auth\.js"></script>)', "$faviconBlock`n`n    `$1"
            Write-Host "  - Favicon-Block vor modern-auth.js hinzugefügt"  
            $updated = $true
        }
        elseif ($content -match '(<title>.*?</title>)') {
            $content = $content -replace '(<title>.*?</title>)', "`$1`n`n$faviconBlock"
            Write-Host "  - Favicon-Block nach title hinzugefügt"
            $updated = $true
        }
    }
    
    # 3. Speichere nur wenn Änderungen vorgenommen wurden
    if ($updated) {
        Set-Content $_.FullName $content
        Write-Host "  ✅ Datei aktualisiert"
    } else {
        Write-Host "  ➡️ Keine Änderungen nötig"
    }
}

Write-Host "`nFirefox und iPad Fixes angewendet!"