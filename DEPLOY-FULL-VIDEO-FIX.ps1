$ErrorActionPreference = "Stop"

Write-Host "GTRADES-AXIS FULL Student Video Fix v3" -ForegroundColor Cyan

$required = @(
  ".\firebase.json",
  ".\firestore.rules",
  ".\index.html",
  ".\dashboard.html",
  ".\videos.html",
  ".\js\dashboard.js"
)

foreach ($f in $required) {
  if (!(Test-Path $f)) {
    Write-Host "ERROR: Missing $f" -ForegroundColor Red
    Write-Host "Run this script ONLY from the extracted FULL project folder." -ForegroundColor Yellow
    exit 1
  }
}

$marker = Select-String -Path ".\videos.html" -Pattern "VIDEO ACCESS BUILD: 2026-11-02-STUDENT-FIX-3" -Quiet
if (!$marker) {
  Write-Host "ERROR: This is not the corrected videos.html build." -ForegroundColor Red
  exit 1
}

$old = Select-String -Path ".\videos.html" -Pattern "createdAt ordering failed. Loading normally." -Quiet
if ($old) {
  Write-Host "ERROR: Old video code is still present." -ForegroundColor Red
  exit 1
}

Write-Host "Verified full project + corrected videos.html" -ForegroundColor Green

firebase use gtrades-axis
firebase deploy --only firestore:rules,hosting

Write-Host ""
Write-Host "DEPLOY COMPLETE" -ForegroundColor Green
Write-Host "Open https://gtradesaxis.com/videos"
Write-Host "Press Ctrl+Shift+R"
Write-Host "Console MUST show: VIDEO ACCESS BUILD: 2026-11-02-STUDENT-FIX-3"
