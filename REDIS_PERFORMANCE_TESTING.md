# Redis Performance Testing Guide

## Install Redis (Windows)

### Option 1: Using Chocolatey
```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Redis
choco install redis-64 -y

# Start Redis
redis-server
```

### Option 2: Using Windows Subsystem for Linux (WSL)
```bash
# Install WSL (if not installed)
wsl --install

# Install Redis in WSL
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start
```

### Option 3: Using Docker
```bash
# Install Docker Desktop for Windows
# Download from: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

# Run Redis container
docker run -d -p 6379:6379 --name redis redis:alpine

# Start existing container
docker start redis
```

## Performance Comparison Test

### 1. Test Without Redis (Current State)
```bash
# API Response Time Test
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:4000/api/v1/notifications"
```

### 2. Start Redis and Test With Cache
```bash
# Start Redis server
redis-server

# Restart your application
npm run dev

# Test same endpoint - first request (cache miss)
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:4000/api/v1/notifications"

# Test same endpoint - second request (cache hit)
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:4000/api/v1/notifications"
```

### Create curl-format.txt for timing
```txt
     time_namelookup:  %{time_namelookup}s\n
        time_connect:  %{time_connect}s\n
     time_appconnect:  %{time_appconnect}s\n
    time_pretransfer:  %{time_pretransfer}s\n
       time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
          time_total:  %{time_total}s\n
```

## Expected Results

### Without Redis
- First request: ~100-200ms
- Subsequent requests: ~100-200ms (always hits database)
- Cache-Control: no-cache

### With Redis  
- First request: ~100-200ms (cache miss, hits database + writes cache)
- Subsequent requests: ~5-20ms (cache hit)
- Cache-Control: max-age=120

## Monitoring Cache Performance

### Check Redis Status in Application
```javascript
// Add to any controller to check cache status
console.log('Cache Status:', {
  enabled: redisClient.isEnabled(),
  connected: redisClient.isConnected(),
  ping: await redisClient.ping()
});
```

### Redis Commands for Monitoring
```bash
# Connect to Redis CLI
redis-cli

# Check cached keys
KEYS notification*

# Check cache hit statistics
INFO stats

# Monitor real-time commands
MONITOR
```
