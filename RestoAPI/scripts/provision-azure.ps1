# Provision all Azure resources for Resto API
# Usage: ./scripts/provision-azure.ps1
# Prerequisites: az cli logged in with Owner role on subscription dc52f282-e41c-435b-ab2f-5e6c4b552380

param(
    [string]$SubscriptionId = "dc52f282-e41c-435b-ab2f-5e6c4b552380",
    [string]$ResourceGroup  = "rg-resto",
    [string]$Location       = "eastus",
    [string]$AppServicePlan = "asp-resto",
    [string]$AppService     = "resto-api",
    [string]$MySqlServer    = "resto-db",
    [string]$MySqlAdmin     = "restoadmin",
    [string]$MySqlPassword  = "Resto@2026AI",
    [string]$DbName         = "restodb"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Setting subscription..." -ForegroundColor Cyan
az account set --subscription $SubscriptionId

Write-Host "Creating resource group..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location

Write-Host "Creating MySQL Flexible Server..." -ForegroundColor Cyan
az mysql flexible-server create `
    --resource-group $ResourceGroup `
    --name $MySqlServer `
    --location $Location `
    --admin-user $MySqlAdmin `
    --admin-password $MySqlPassword `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --storage-size 20 `
    --version 8.0.21 `
    --public-access 0.0.0.0

Write-Host "Creating database..." -ForegroundColor Cyan
az mysql flexible-server db create `
    --resource-group $ResourceGroup `
    --server-name $MySqlServer `
    --database-name $DbName

Write-Host "Allowing Azure services to connect to MySQL..." -ForegroundColor Cyan
az mysql flexible-server firewall-rule create `
    --resource-group $ResourceGroup `
    --name $MySqlServer `
    --rule-name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

Write-Host "Creating App Service Plan (Free tier)..." -ForegroundColor Cyan
az appservice plan create `
    --resource-group $ResourceGroup `
    --name $AppServicePlan `
    --location $Location `
    --sku F1 `
    --is-linux

Write-Host "Creating Web App..." -ForegroundColor Cyan
az webapp create `
    --resource-group $ResourceGroup `
    --plan $AppServicePlan `
    --name $AppService `
    --runtime "DOTNETCORE:9.0"

$ConnectionString = "Server=$MySqlServer.mysql.database.azure.com;Port=3306;Database=$DbName;Uid=$MySqlAdmin;Pwd=$MySqlPassword;SslMode=Required;"

Write-Host "Setting app configuration..." -ForegroundColor Cyan
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppService `
    --settings `
        "ConnectionStrings__DefaultConnection=$ConnectionString" `
        "Jwt__Key=RestaurantAppSuperSecretJwtKey2026!" `
        "Jwt__Issuer=RestoAPI" `
        "Jwt__Audience=RestoApp" `
        "Jwt__ExpiryHours=12" `
        "ASPNETCORE_ENVIRONMENT=Production"

Write-Host "`nProvisioning complete!" -ForegroundColor Green
Write-Host "App URL: https://$AppService.azurewebsites.net" -ForegroundColor Yellow
Write-Host "Swagger: https://$AppService.azurewebsites.net/swagger (set EnableSwagger=true in App Settings to enable)" -ForegroundColor Yellow
