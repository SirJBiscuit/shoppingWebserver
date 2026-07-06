# Git Push Script for CloudMC Shop
# Pushes project to GitHub: https://github.com/SirJBiscuit/shoppingWebserver.git

Write-Host "Initializing Git and pushing to GitHub..." -ForegroundColor Green
Write-Host ""

# Initialize git if not already initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
} else {
    Write-Host "Git repository already initialized" -ForegroundColor Green
}

# Add remote if not exists
$remoteExists = git remote | Select-String "origin"
if (-not $remoteExists) {
    Write-Host "Adding remote origin..." -ForegroundColor Cyan
    git remote add origin https://github.com/SirJBiscuit/shoppingWebserver.git
} else {
    Write-Host "Remote origin already exists" -ForegroundColor Green
}

# Stage all files
Write-Host "Staging files..." -ForegroundColor Cyan
git add .

# Commit
Write-Host "Creating commit..." -ForegroundColor Cyan
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Initial commit - Smart Shopping List Application"
}
git commit -m "$commitMessage"

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git branch -M main
git push -u origin main --force

Write-Host ""
Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
Write-Host "Repository: https://github.com/SirJBiscuit/shoppingWebserver.git" -ForegroundColor Cyan
Write-Host ""
