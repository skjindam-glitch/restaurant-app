# Set up Azure DevOps repo + pipeline for Resto API
# Usage: ./scripts/setup-devops-pipeline.ps1
# Prerequisites: az cli + az devops extension installed; logged in

param(
    [string]$OrgUrl         = "https://dev.azure.com/saikiranjindam0407",
    [string]$Project        = "Resto",
    [string]$RepoName       = "RestoAPI",
    [string]$SubscriptionId = "dc52f282-e41c-435b-ab2f-5e6c4b552380",
    [string]$AppService     = "resto-api"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Configuring az devops defaults..." -ForegroundColor Cyan
az devops configure --defaults organization=$OrgUrl project=$Project

Write-Host "Creating DevOps project (skips if it already exists)..." -ForegroundColor Cyan
az devops project create --name $Project --visibility private 2>$null
if (-not $?) { Write-Host "  Project already exists — continuing." -ForegroundColor Yellow }

Write-Host "Creating Git repository..." -ForegroundColor Cyan
az repos create --name $RepoName 2>$null
if (-not $?) { Write-Host "  Repo already exists — continuing." -ForegroundColor Yellow }

Write-Host "Creating Azure service connection..." -ForegroundColor Cyan
$connectionName = "AzureServiceConnection"
az devops service-endpoint azurerm create `
    --azure-rm-service-principal-authentication WorkloadIdentityFederation `
    --azure-rm-subscription-id $SubscriptionId `
    --azure-rm-subscription-name "Azure subscription 1" `
    --name $connectionName

Write-Host "Setting pipeline variable AZURE_SERVICE_CONNECTION..." -ForegroundColor Cyan
# Get the repo ID
$repoId = (az repos show --repository $RepoName --query id -o tsv)

Write-Host "Creating pipeline from azure-pipelines.yml..." -ForegroundColor Cyan
az pipelines create `
    --name "RestoAPI-CI-CD" `
    --repository $RepoName `
    --repository-type tfsgit `
    --branch main `
    --yml-path azure-pipelines.yml `
    --skip-first-run

Write-Host "Setting pipeline variables..." -ForegroundColor Cyan
$pipelineId = (az pipelines show --name "RestoAPI-CI-CD" --query id -o tsv)
az pipelines variable create `
    --pipeline-id $pipelineId `
    --name AZURE_SERVICE_CONNECTION `
    --value $connectionName

Write-Host "`nDevOps setup complete!" -ForegroundColor Green
Write-Host "Push code to: $OrgUrl/$Project/_git/$RepoName" -ForegroundColor Yellow
Write-Host "Pipeline:     $OrgUrl/$Project/_build" -ForegroundColor Yellow
