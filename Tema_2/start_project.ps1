Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d D:\Fac3\Sem 2\CC\Tema_1 && npm start .\server.js"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d D:\Fac3\Sem 2\CC\Tema_2\backend && uvicorn main:app --reload --port 8001"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d D:\Fac3\Sem 2\CC\Tema_2\frontend && npx vite"
