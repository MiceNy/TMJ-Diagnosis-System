# ===== CONFIG =====
$projectPath = Get-Location
$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$envPath = "$projectPath\.env"

# ===== START NEXT.JS =====
Start-Process powershell -ArgumentList "cd '$projectPath'; npm run dev"

Start-Sleep -Seconds 5

# ===== RUN CLOUDFLARE + CAPTURE OUTPUT =====
$output = cmd /c "`"$cloudflaredPath`" tunnel --url http://localhost:3000"

# ===== FIND LINK =====
$linkMatch = [regex]::Match($output, "https://[a-zA-Z0-9\-]+\.trycloudflare\.com")

if ($linkMatch.Success) {
    $link = $linkMatch.Value
    Write-Host "Found link: $link"

    # ===== UPDATE .env =====
    $envContent = Get-Content $envPath
    $newEnv = $envContent -replace 'NEXTAUTH_URL=".*"', "NEXTAUTH_URL=""$link"""
    $newEnv | Set-Content $envPath

    Write-Host "Updated .env"
}
else {
    Write-Host "Cannot find link"
}