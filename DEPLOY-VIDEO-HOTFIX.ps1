$ErrorActionPreference = "Stop"

Write-Host "GTRADES-AXIS Student Video Hotfix" -ForegroundColor Cyan

if (!(Test-Path ".\videos.html")) {
  Write-Host "ERROR: Run this script from the extracted hotfix folder." -ForegroundColor Red
  exit 1
}

Write-Host "`nChecking build marker..." -ForegroundColor Yellow
Select-String -Path ".\videos.html" -Pattern "VIDEO ACCESS BUILD: 2026-11-02-STUDENT-FIX-3"

Write-Host "`nChecking Firestore video rule..." -ForegroundColor Yellow
Select-String -Path ".\firestore.rules" -Pattern "resource.data.premiumOnly == false \|\| hasPremiumAccess\(\)"

Write-Host "`nSelecting Firebase project..." -ForegroundColor Yellow
firebase use gtrades-axis

Write-Host "`nDeploying Firestore rules + Hosting..." -ForegroundColor Yellow
firebase deploy --only firestore:rules,hosting

Write-Host "`nDEPLOY COMPLETE." -ForegroundColor Green
Write-Host "Open https://gtradesaxis.com/videos and press Ctrl+Shift+R"
Write-Host "Console MUST show: VIDEO ACCESS BUILD: 2026-11-02-STUDENT-FIX-3"
