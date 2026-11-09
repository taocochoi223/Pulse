# Pulse Backend Launcher
Write-Host "Starting Pulse ASP.NET Core Web API on http://localhost:5000..." -ForegroundColor Cyan
dotnet run --project apps/backend/src/Pulse.WebAPI --urls "http://localhost:5000"
