cd C:\Users\gduff\casebrain-hub

while ($true) {
  try {
    npm run dev
  } catch {
    Write-Host "Dev server crashed, restarting in 3 seconds..."
    Start-Sleep -Seconds 3
  }
}

