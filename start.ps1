# CloudMC Shop - Startup Script

Write-Host "Starting CloudMC Shop..." -ForegroundColor Green

# Check if Docker is running
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerRunning) {
    Write-Host "Error: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please edit .env file with your secure credentials before continuing." -ForegroundColor Yellow
    exit 1
}

# Build and start containers
Write-Host "Building and starting Docker containers..." -ForegroundColor Cyan
docker-compose up -d --build

# Wait for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Cyan
docker exec shop_backend npm run migrate

Write-Host ""
Write-Host "CloudMC Shop is now running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3006" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view logs: docker-compose logs -f" -ForegroundColor Yellow
Write-Host "To stop: docker-compose down" -ForegroundColor Yellow
Write-Host ""
