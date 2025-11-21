cd C:\Users\gduff\casebrain-hub

if (-not (Test-Path "node_modules")) {
  npm install
}

npm run worker:pi-risk


