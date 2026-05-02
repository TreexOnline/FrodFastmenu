# Script para executar release.ps1 como Administrador

# Configurar variáveis
$token = $env:GITHUB_TOKEN
$projectPath = "C:\Users\Usuario\Desktop\FrodFastmenu-master\FrodFastmenu-master"

# Iniciar PowerShell como Administrador
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -Command `"cd '$projectPath'; `$env:GITHUB_TOKEN = '$token'; .\release.ps1`""
