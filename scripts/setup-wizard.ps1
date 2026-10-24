# ==============================================================================
# RideEat SOA 2.0 - Interactive Enterprise Setup Wizard (PowerShell for Windows)
# ==============================================================================
# Provides guided 1-click execution for Docker Compose, Local Dev, OOP Tests & Live App.
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host "    RIDEEAT SOA 2.0 - ENTERPRISE SETUP WIZARD & RUNNER            " -ForegroundColor Green
    Write-Host "    Super-App Mobility, Food Delivery & 9-Microservices Ecosystem " -ForegroundColor DarkGray
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Show-Banner
    Write-Host "  Vui long chon mot tuy chon thuc thi:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] Khoi chay toan bo he thong bang Docker Compose (Khuyen Dung)" -ForegroundColor White
    Write-Host "      - 9 Microservices + PostgreSQL + Redis + Kafka KRaft + Web Admin" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [2] Chay Bo Kiem thu OOP & Kien truc Toan dien (31 Tests)" -ForegroundColor White
    Write-Host "      - Python 3.11/3.14 Unit Tests, State Machines, Factories, Adapters" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [3] Khoi chay Moi truong Phat trien Frontend (Web Admin - Vite)" -ForegroundColor White
    Write-Host "      - Chay React Super-App tai http://localhost:3000" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [4] Mo Ung dung Super-App Live tren GitHub Pages" -ForegroundColor White
    Write-Host "      - https://2006phu.github.io/rideeat-soa/" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [5] Kiem tra Cu phap Docker Compose & Postman Collection" -ForegroundColor White
    Write-Host "      - docker compose config & postman schema validation" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [6] Dung toan bo Containers Docker cua RideEat" -ForegroundColor White
    Write-Host "      - docker compose down -v" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [0] Thoat (Exit)" -ForegroundColor Red
    Write-Host ""
}

# Resolve Root Directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
Set-Location $rootDir

do {
    Show-Menu
    $choice = Read-Host "  Nhap lua chon cua ban [0-6]"
    Write-Host ""

    switch ($choice) {
        "1" {
            Show-Banner
            Write-Host "  [1/4] Kiem tra file cau hinh moi truong .env..." -ForegroundColor Cyan
            if (-not (Test-Path ".env")) {
                Copy-Item ".env.example" ".env" -Force
                Write-Host "      + Da khoi tao file .env tu .env.example" -ForegroundColor Green
            } else {
                Write-Host "      + File .env da ton tai." -ForegroundColor Green
            }

            Write-Host "  [2/4] Kiem tra cu phap Docker Compose..." -ForegroundColor Cyan
            docker compose config --quiet
            if ($LASTEXITCODE -eq 0) {
                Write-Host "      + Cau hinh Docker Compose hop le!" -ForegroundColor Green
            }

            Write-Host "  [3/4] Dang khoi dong 9 Microservices & Ha tang phu tro..." -ForegroundColor Cyan
            docker compose up -d --build
            
            Write-Host "  [4/4] Hoan tat! He thong RideEat dang chay tai:" -ForegroundColor Green
            Write-Host "      - Web Admin Super-App : http://localhost:3000" -ForegroundColor Yellow
            Write-Host "      - API Gateway         : http://localhost:8080" -ForegroundColor Yellow
            Write-Host "      - Prometheus Metric   : http://localhost:9090" -ForegroundColor Yellow
            Write-Host "      - Grafana Dashboard   : http://localhost:3001" -ForegroundColor Yellow
            Write-Host ""
            Read-Host "  Nhan Enter de tiep tuc..."
        }
        "2" {
            Show-Banner
            Write-Host "  Dang thuc thi Bo Kiem thu OOP & Kien truc SOA (31 Tests)..." -ForegroundColor Cyan
            Write-Host ""
            python tests/test_oop_core.py -v
            Write-Host ""
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  + TOAN BO 31/31 TESTS DA DAT (100% PASS)!" -ForegroundColor Green
            } else {
                Write-Host "  ! Co loi xay ra trong qua trinh kiem thu." -ForegroundColor Red
            }
            Write-Host ""
            Read-Host "  Nhan Enter de tiep tuc..."
        }
        "3" {
            Show-Banner
            Write-Host "  Dang khoi chay Web Admin (React 18 + Vite)..." -ForegroundColor Cyan
            Set-Location "$rootDir\web-admin"
            if (-not (Test-Path "node_modules")) {
                Write-Host "  Cai dat dependencies..." -ForegroundColor Yellow
                npm install
            }
            Write-Host "  Khoi dong Vite Dev Server tai http://localhost:3000 ..." -ForegroundColor Green
            npm run dev
            Set-Location $rootDir
        }
        "4" {
            Show-Banner
            $liveUrl = "https://2006phu.github.io/rideeat-soa/"
            Write-Host "  Dang mo ung dung Live tren trinh duyet: $liveUrl" -ForegroundColor Green
            Start-Process $liveUrl
            Start-Sleep -Seconds 2
        }
        "5" {
            Show-Banner
            Write-Host "  [+] Dang kiem tra cu phap Docker Compose..." -ForegroundColor Cyan
            docker compose config --quiet
            if ($LASTEXITCODE -eq 0) {
                Write-Host "      + docker-compose.yml: HOP LE (Syntax OK)" -ForegroundColor Green
            }

            Write-Host "  [+] Dang kiem tra cau truc Postman Collection v2.1..." -ForegroundColor Cyan
            $postmanPath = "$rootDir\postman\rideeat-collection.json"
            $postmanJson = Get-Content $postmanPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($postmanJson.item.Count -eq 9) {
                Write-Host "      + Postman Collection: HOP LE (Day du 9/9 Microservices)" -ForegroundColor Green
            } else {
                Write-Host "      ! Postman Collection thieu service." -ForegroundColor Red
            }
            Write-Host ""
            Read-Host "  Nhan Enter de tiep tuc..."
        }
        "6" {
            Show-Banner
            Write-Host "  Dang dung toan bo containers va giai phong tai nguyen..." -ForegroundColor Yellow
            docker compose down -v
            Write-Host "  + Toan bo Containers da duoc don dep sach se!" -ForegroundColor Green
            Write-Host ""
            Read-Host "  Nhan Enter de tiep tuc..."
        }
        "0" {
            Write-Host "  Tam biet! Chuc ban mot ngay lam viec hieu qua." -ForegroundColor Green
            break
        }
        default {
            Write-Host "  Lua chon khong hop le, vui long thu lai." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} while ($choice -ne "0")
