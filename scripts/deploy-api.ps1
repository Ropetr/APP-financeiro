# =====================================================
# Script de Deploy - APP Financeiro
# Execute no PowerShell como Administrador
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APP FINANCEIRO - SCRIPT DE DEPLOY    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navegar para a pasta do projeto
$projectPath = "C:\Users\WINDOWS GAMER\Desktop\APP FInanceiro"
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "[OK] Pasta do projeto encontrada" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Pasta do projeto nao encontrada: $projectPath" -ForegroundColor Red
    Write-Host "Por favor, ajuste o caminho no script." -ForegroundColor Yellow
    exit 1
}

# Fazer pull das alteracoes
Write-Host ""
Write-Host "[1/5] Atualizando codigo do GitHub..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[AVISO] Erro no git pull, continuando..." -ForegroundColor Yellow
}

# Instalar dependencias
Write-Host ""
Write-Host "[2/5] Instalando dependencias..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao instalar dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green

# Navegar para a pasta da API
Set-Location "$projectPath\apps\api"

# Gerar JWT_SECRET se nao existir
Write-Host ""
Write-Host "[3/5] Configurando secrets..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: Voce precisa configurar o JWT_SECRET." -ForegroundColor Cyan
Write-Host "Quando solicitado, cole a seguinte chave (gerada automaticamente):" -ForegroundColor Cyan
Write-Host ""

# Gerar chave JWT aleatoria
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host $jwtSecret -ForegroundColor Green
Write-Host ""
Write-Host "Copie a chave acima e cole quando solicitado." -ForegroundColor Yellow
Write-Host ""

# Configurar secret
Write-Host "Executando: npx wrangler secret put JWT_SECRET" -ForegroundColor Gray
npx wrangler secret put JWT_SECRET

# Deploy
Write-Host ""
Write-Host "[4/5] Fazendo deploy do Worker..." -ForegroundColor Yellow
npx wrangler deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha no deploy" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Deploy concluido!" -ForegroundColor Green

# Testar API
Write-Host ""
Write-Host "[5/5] Testando API..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$response = Invoke-RestMethod -Uri "https://financeiro-api.workers.dev" -Method Get -ErrorAction SilentlyContinue
if ($response) {
    Write-Host "[OK] API respondendo!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json
} else {
    Write-Host "[AVISO] API pode demorar alguns segundos para iniciar" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY CONCLUIDO COM SUCESSO!        " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL da API: https://financeiro-api.workers.dev" -ForegroundColor White
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Testar endpoints de auth (register, login)" -ForegroundColor White
Write-Host "2. Configurar STRIPE_SECRET_KEY quando tiver" -ForegroundColor White
Write-Host "3. Configurar STRIPE_WEBHOOK_SECRET quando tiver" -ForegroundColor White
Write-Host ""
