@echo off
echo ========================================================
echo  FlyRank AI — Docker Production Deployment
echo ========================================================
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    echo Or install via Windows Terminal: winget install Docker.DockerDesktop
    pause
    exit /b 1
)

echo [1/3] Building multi-stage Docker images...
docker compose build

if %errorlevel% neq 0 (
    echo [ERROR] Docker build failed.
    pause
    exit /b 1
)

echo [2/3] Starting FlyRank App and Redis containers...
docker compose up -d

echo [3/3] Checking container status...
docker compose ps

echo.
echo ========================================================
echo  FlyRank is LIVE in Docker!
echo  Web UI & MCP Server: http://localhost:3000
echo  Health Check:        http://localhost:3000/healthz
echo  MCP Endpoint:        http://localhost:3000/mcp
echo ========================================================
pause
