taskkill /F /IM node.exe 2>$null

cd C:\Users\gduff\casebrain-hub

if (-not (Test-Path "node_modules")) {
  npm install
}

npm run dev

