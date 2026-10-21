<#
.SYNOPSIS
    Khởi chạy Ngrok Tunnel cho API Gateway (cổng 8080) hoặc Web Admin (cổng 3000) của RideEat SOA.
#>
param(
    [int]$Port = 8080,
    [string]$AuthToken = $env:NGROK_AUTHTOKEN
)

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   RIDEEAT SOA - NGROK PUBLIC TUNNEL LAUNCHER" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

if ($AuthToken) {
    Write-Host "[+] Configuring Ngrok Authtoken..." -ForegroundColor Green
    ngrok config add-authtoken $AuthToken
}

Write-Host "[+] Opening HTTPS tunnel to http://localhost:$Port ..." -ForegroundColor Yellow
Write-Host "[i] Ngrok Web Inspector UI: http://localhost:4040" -ForegroundColor Gray
Write-Host "[i] Copy the https://xxxx.ngrok-free.app URL into GitHub Secrets (VITE_API_BASE_URL) or Mobile App!" -ForegroundColor Green

ngrok http $Port
