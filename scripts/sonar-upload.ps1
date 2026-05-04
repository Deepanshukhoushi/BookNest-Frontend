# Sonar Upload Script
# Reads SONAR_HOST_URL and SONAR_TOKEN from environment variables.
# Set them locally in your shell session or .env file (never commit the .env file).
#
# Usage:
#   $env:SONAR_HOST_URL = "http://localhost:9000"
#   $env:SONAR_TOKEN    = "squ_your_token_here"
#   powershell -ExecutionPolicy Bypass -File scripts/sonar-upload.ps1

# Fix LCOV paths so SonarQube can map them to source files
$lcovPath = "coverage/booknest-frontend-app/lcov.info"
if (Test-Path $lcovPath) {
    Write-Host "Fixing LCOV paths..."
    $content = Get-Content $lcovPath
    # Replace SF:src/ or SF:src\ with SF:
    $content = $content -replace 'SF:src[\\/]', 'SF:'
    Set-Content -Path $lcovPath -Value $content -Encoding UTF8
    Write-Host "LCOV paths adjusted for SonarQube."
} else {
    Write-Warning "LCOV report not found at $lcovPath"
}

# Build scanner arguments from environment variables (fall back gracefully)
$sonarArgs = @()

$hostUrl = $env:SONAR_HOST_URL
if ($hostUrl) {
    $sonarArgs += "-Dsonar.host.url=$hostUrl"
} else {
    Write-Warning "SONAR_HOST_URL not set. SonarQube will use the value in sonar-project.properties if present."
}

$token = $env:SONAR_TOKEN
if ($token) {
    $sonarArgs += "-Dsonar.token=$token"
} else {
    Write-Warning "SONAR_TOKEN not set. SonarQube will use the value in sonar-project.properties if present."
}

# Run Sonar Scanner
if ($sonarArgs.Count -gt 0) {
    npx sonar-scanner @sonarArgs
} else {
    npm run sonar
}
