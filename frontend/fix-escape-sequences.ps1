# Repariert korrupte Escape-Sequenzen in HTML-Dateien

$fixedFavicon = @'
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
    
    # Prüfe auf korrupte Escape-Sequenzen
    if ($content -match '`n.*?f.r.*?`n') {
        Write-Host "Repariere: $($_.Name)"
        
        # Entferne die korrupte Favicon-Sektion komplett
        $content = $content -replace '<!-- Favicon Integration - Firefox-optimiert -->.*?<link rel="icon" href="favicon\.ico" type="image/x-icon">', $fixedFavicon, 'Singleline'
        
        Set-Content $_.FullName $content
        Write-Host "  ✅ Repariert"
    } else {
        Write-Host "OK: $($_.Name)"
    }
}

Write-Host "Fertig - alle Escape-Sequenzen entfernt!"