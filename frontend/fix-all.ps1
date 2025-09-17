# Firefox & iPad Fixes für alle HTML-Dateien

$faviconBlock = @'
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
'@

Get-ChildItem -Path "c:\CueupV2" -Filter "*.html" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $updated = $false
    
    Write-Host "Bearbeite: $($_.Name)"
    
    # 1. Repariere korrupte stylesheet-Links
    if ($content -match 'rel="stylesheet".*?href=') {
        $content = $content -replace 'rel="stylesheet"`n.*?`n.*?`n.*?href=', 'rel="stylesheet" href='
        Write-Host "  - Stylesheet-Link repariert"
        $updated = $true
    }
    
    # 2. Füge Favicon-Block hinzu falls nicht vorhanden
    if ($content -notmatch 'Firefox-optimiert') {
        if ($content -match '(<script src="config\.js"></script>)') {
            $content = $content -replace '(<script src="config\.js"></script>)', "`$1`n`n$faviconBlock"
            Write-Host "  - Favicon-Block hinzugefuegt"
            $updated = $true
        }
        elseif ($content -match '(<title>.*?</title>)') {
            $content = $content -replace '(<title>.*?</title>)', "`$1`n`n$faviconBlock"
            Write-Host "  - Favicon-Block nach title hinzugefuegt"
            $updated = $true
        }
    }
    
    if ($updated) {
        Set-Content $_.FullName $content
        Write-Host "  OK - Datei aktualisiert"
    } else {
        Write-Host "  OK - Keine Aenderungen noetig"
    }
}

Write-Host "Firefox und iPad Fixes fertig!"