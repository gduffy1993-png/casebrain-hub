cd C:\Users\gduff\casebrain-hub

if (-not (Test-Path "node_modules")) {
  npm install
}

npm run workers:dev

