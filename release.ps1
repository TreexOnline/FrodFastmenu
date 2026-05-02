# FrodFast Production Release Script
# Electron Builder + Electron Updater Pipeline

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    $colorMap = @{
        "Success" = "Green"
        "Error" = "Red"
        "Warning" = "Yellow"
        "Info" = "Cyan"
        "Header" = "Magenta"
        "White" = "White"
    }
    $actualColor = $colorMap[$Color]
    if ($actualColor) {
        Write-Host $Message -ForegroundColor $actualColor
    } else {
        Write-Host $Message
    }
}

function Test-AdminPrivileges {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        Write-ColorOutput "ERRO: Execute o PowerShell COMO ADMINISTRADOR. Sem privilégio de symlink o electron-builder falha." "Error"
        exit 1
    }

    Write-ColorOutput "✅ PowerShell executando como Administrador" "Success"
}

function Test-Prerequisites {
    Write-ColorOutput "Verificando pré-requisitos..." "Info"
    
    if ([string]::IsNullOrEmpty($Token)) {
        Write-ColorOutput "ERRO: GITHUB_TOKEN não encontrado. Configure `$env:GITHUB_TOKEN ou use -Token" "Error"
        exit 1
    }
    
    if (-not (Test-Path "electron-app\package.json")) {
        Write-ColorOutput "ERRO: electron-app\package.json não encontrado. Execute este script na raiz do projeto." "Error"
        exit 1
    }
    
    Write-ColorOutput "✅ Pré-requisitos verificados" "Success"
}

function Clear-BuilderEnvironment {
    Write-ColorOutput "`n🧹 Limpando ambiente electron-builder..." "Info"
    
    $paths = @(
        "$env:LOCALAPPDATA\electron-builder",
        "$env:LOCALAPPDATA\electron-builder\Cache",
        "electron-app\dist",
        "electron-app\.builder-cache"
    )

    foreach ($path in $paths) {
        if (Test-Path $path) {
            try {
                Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-ColorOutput "   Removido: $path" "DarkYellow"
            } catch {
                Write-ColorOutput "   Falha ao remover: $path" "Warning"
            }
        }
    }

    Write-ColorOutput "✅ Ambiente limpo" "Success"
}

function New-LocalCache {
    Write-ColorOutput "`n📦 Criando cache local..." "Info"
    
    $cachePath = Join-Path (Get-Location) "electron-app\.builder-cache"
    
    try {
        New-Item -ItemType Directory -Path $cachePath -Force | Out-Null
        $env:ELECTRON_BUILDER_CACHE = $cachePath
        Write-ColorOutput "✅ Cache local criado: $cachePath" "Success"
    }
    catch {
        Write-ColorOutput "ERRO: Falha ao criar cache local: $($_.Exception.Message)" "Error"
        exit 1
    }
}

function Set-BuilderEnvironment {
    Write-ColorOutput "`n🛡️ Configurando ambiente hardened..." "Info"
    
    $env:GH_TOKEN = $Token
    $env:GITHUB_TOKEN = $Token
    $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
    $env:USE_HARD_LINKS = "false"
    
    Write-ColorOutput "✅ Variáveis de ambiente configuradas" "Success"
}

function Get-AppVersion {
    try {
        $packageJson = Get-Content "electron-app\package.json" -Raw | ConvertFrom-Json
        return $packageJson.version
    }
    catch {
        Write-ColorOutput "ERRO: Falha ao ler versão: $($_.Exception.Message)" "Error"
        exit 1
    }
}

function Start-Build {
    Write-ColorOutput "`n🚀 Executando build electron-builder..." "Header"
    
    try {
        Set-Location "electron-app"
        
        Write-ColorOutput "Executando: npx electron-builder --publish always" "Info"
        npx electron-builder --publish always
        
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "ERRO: Build falhou com código: $LASTEXITCODE" "Error"
            return $false
        }
        
        Set-Location ".."
        return $true
    }
    catch {
        Write-ColorOutput "ERRO: Falha durante build: $($_.Exception.Message)" "Error"
        Set-Location ".." -ErrorAction SilentlyContinue
        return $false
    }
}

function Test-Artifacts {
    Write-ColorOutput "`n📦 Validando artefatos gerados..." "Info"
    
    $distPath = "electron-app\dist"
    
    if (-not (Test-Path $distPath)) {
        Write-ColorOutput "ERRO: Diretório dist não encontrado" "Error"
        return $false
    }
    
    $requiredFiles = @(
        "*.exe",
        "*.zip", 
        "latest.yml",
        "*.blockmap"
    )
    
    $foundFiles = @()
    $missingFiles = @()
    
    foreach ($pattern in $requiredFiles) {
        $files = Get-ChildItem -Path $distPath -Filter $pattern -Recurse -ErrorAction SilentlyContinue
        if ($files.Count -gt 0) {
            $foundFiles += $files | ForEach-Object { $_.Name }
            Write-ColorOutput "   ✅ $pattern - $($files.Count) arquivo(s)" "Success"
        } else {
            $missingFiles += $pattern
            Write-ColorOutput "   ❌ $pattern - não encontrado" "Error"
        }
    }
    
    Write-ColorOutput "`nArtefatos encontrados:" "Header"
    foreach ($file in $foundFiles) {
        Write-ColorOutput "   📦 $file" "Cyan"
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-ColorOutput "`nERRO: Artefatos obrigatórios faltando:" "Error"
        foreach ($missing in $missingFiles) {
            Write-ColorOutput "   ❌ $missing" "Error"
        }
        return $false
    }
    
    return $true
}

function Show-Success {
    param([string]$Version)
    
    Write-ColorOutput "`n" "White"
    Write-ColorOutput "==============================================" "Green"
    Write-ColorOutput "✅ RELEASE PRODUCTION CONCLUÍDO COM SUCESSO" "Green"
    Write-ColorOutput "==============================================" "Green"
    Write-ColorOutput "Versão: v$Version" "Info"
    Write-ColorOutput "Release: https://github.com/VictorTreex/app-FrodFast-eletron/releases/tag/v$Version" "Info"
    Write-ColorOutput "Auto-update: Configurado e funcionando" "Success"
    Write-ColorOutput "==============================================" "Green"
}

# ==================== EXECUÇÃO PRINCIPAL ====================

try {
    Write-ColorOutput "" "White"
    Write-ColorOutput "==============================================" "Header"
    Write-ColorOutput "FRODFAST PRODUCTION RELEASE SCRIPT" "Header"
    Write-ColorOutput "Electron Builder + Auto-updater Pipeline" "Header"
    Write-ColorOutput "==============================================" "Header"
    
    Test-AdminPrivileges
    Test-Prerequisites
    Clear-BuilderEnvironment
    New-LocalCache
    Set-BuilderEnvironment
    
    $version = Get-AppVersion
    Write-ColorOutput "`n📌 Versão detectada: v$version" "Info"
    
    $buildSuccess = Start-Build
    
    if ($buildSuccess) {
        $artifactsValid = Test-Artifacts
        
        if ($artifactsValid) {
            Show-Success -Version $version
        } else {
            Write-ColorOutput "ERRO: Validação de artefatos falhou" "Error"
            exit 1
        }
    } else {
        Write-ColorOutput "ERRO: Build falhou" "Error"
        exit 1
    }
}
catch {
    Write-ColorOutput "ERRO FATAL: $($_.Exception.Message)" "Error"
    Write-ColorOutput "Stack Trace: $($_.ScriptStackTrace)" "Error"
    exit 1
}
