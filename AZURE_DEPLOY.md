# Azure Deployment Guide — RestoAPI + Website

This guide creates two Azure resources and wires them together with GitHub Actions CI/CD:

| What | Azure Resource | URL pattern |
|------|---------------|-------------|
| RestoAPI (.NET 9) | App Service (Linux) | `https://resto-api-XXXX.azurewebsites.net` |
| Website (React/Vite) | Static Web Apps | `https://xxxx.azurestaticapps.net` |
| Database | Azure SQL | accessed only by the API |

---

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and signed in (`az login`)
- A GitHub account
- A free or paid Azure subscription

---

## Step 1 — Push the project to GitHub

```powershell
cd "d:\Claude AI Projects\Restaurant App"

# Initialise git (repo doesn't exist yet)
git init
git add .
git commit -m "Initial commit"

# Create a new GitHub repo (requires gh CLI — https://cli.github.com)
gh repo create restaurant-app --private --source=. --push
```

> **Without gh CLI:** create the repo on github.com, then run:
> ```
> git remote add origin https://github.com/YOUR-USERNAME/restaurant-app.git
> git branch -M main
> git push -u origin main
> ```

---

## Step 2 — Create Azure resources

Pick a unique suffix (4-6 chars) to avoid name conflicts — e.g. your initials + year: `skj26`.

```powershell
$suffix = "skj26"            # ← change this to something unique
$rg     = "rg-resto"
$loc    = "eastus"
$plan   = "asp-resto"
$api    = "resto-api-$suffix"
$sql    = "sql-resto-$suffix"
$db     = "restodb"
$swa    = "swa-resto-$suffix"

# SQL admin credentials — pick a strong password
$sqlUser = "restoadmin"
$sqlPass = "P@ssw0rd$suffix!"   # change this to something strong

# ── Resource Group ──────────────────────────────────────────────────────────
az group create --name $rg --location $loc

# ── App Service Plan (Linux, Free tier) ─────────────────────────────────────
# Free F1 is fine for testing; upgrade to B1 ($13/mo) for always-on + custom domain
az appservice plan create `
  --name $plan `
  --resource-group $rg `
  --location $loc `
  --is-linux `
  --sku F1

# ── App Service (API) ────────────────────────────────────────────────────────
az webapp create `
  --name $api `
  --resource-group $rg `
  --plan $plan `
  --runtime "DOTNETCORE:9.0"

# ── Azure SQL Server + Database ──────────────────────────────────────────────
az sql server create `
  --name $sql `
  --resource-group $rg `
  --location $loc `
  --admin-user $sqlUser `
  --admin-password $sqlPass

# Allow Azure services to reach SQL (required by App Service)
az sql server firewall-rule create `
  --resource-group $rg `
  --server $sql `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0

az sql db create `
  --resource-group $rg `
  --server $sql `
  --name $db `
  --service-objective Basic    # ~$5/mo; change to S0 for production

# ── Azure Static Web Apps (Website) ─────────────────────────────────────────
az staticwebapp create `
  --name $swa `
  --resource-group $rg `
  --location "eastus2" `
  --sku Free
```

> **Write down** the SQL admin password — you'll need it in Step 3.

---

## Step 3 — Configure App Service application settings

These environment variables override `appsettings.Production.json` at runtime. ASP.NET Core maps `__` (double-underscore) to `:` for nested config keys.

```powershell
# Build the connection string (replace values with yours)
$connStr = "Server=tcp:$sql.database.windows.net,1433;Initial Catalog=$db;Persist Security Info=False;User ID=$sqlUser;Password=$sqlPass;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

# Get the Static Web App hostname (you'll set this in a moment — placeholder for now)
# Run this after Step 5 to get the real hostname:
#   az staticwebapp show --name $swa --resource-group $rg --query "defaultHostname" -o tsv

$websiteUrl = "https://YOUR-SWA-HOSTNAME.azurestaticapps.net"   # ← fill in after Step 5

# Generate a strong JWT key (32+ chars)
$jwtKey = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
Write-Host "JWT Key: $jwtKey"   # ← save this somewhere safe

az webapp config appsettings set `
  --name $api `
  --resource-group $rg `
  --settings `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ConnectionStrings__DefaultConnection=$connStr" `
    "Jwt__Key=$jwtKey" `
    "Jwt__Issuer=RestoAPI" `
    "Jwt__Audience=RestoApp" `
    "Jwt__ExpiryHours=12" `
    "Cors__Origins__0=$websiteUrl"
```

---

## Step 4 — Add GitHub Secrets

Go to: **GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|-------------|-------|
| `AZURE_APP_SERVICE_NAME` | `resto-api-skj26` (your app name from Step 2) |
| `AZURE_APP_SERVICE_PUBLISH_PROFILE` | *(see below)* |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | *(see below)* |
| `VITE_API_URL` | `https://resto-api-skj26.azurewebsites.net` |

### Get the publish profile (for the API secret)

```powershell
# Downloads the XML publish profile to clipboard
az webapp deployment list-publishing-profiles `
  --name $api `
  --resource-group $rg `
  --xml | Set-Clipboard
```
Paste the entire XML into the `AZURE_APP_SERVICE_PUBLISH_PROFILE` secret.

### Get the Static Web Apps deployment token

```powershell
az staticwebapp secrets list `
  --name $swa `
  --resource-group $rg `
  --query "properties.apiKey" `
  -o tsv | Set-Clipboard
```
Paste the token into the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret.

---

## Step 5 — Trigger the first deployment

The workflows run automatically on every push to `main` when files in `RestoAPI/` or `Website/` change. To force a run right now:

```powershell
# Trigger API deploy
gh workflow run "Deploy RestoAPI → Azure App Service"

# Trigger Website deploy
gh workflow run "Deploy Website → Azure Static Web Apps"
```

Or: go to **GitHub → Actions tab → select workflow → Run workflow**.

Watch the jobs complete (usually 2–4 minutes each).

---

## Step 6 — Update CORS with the real Static Web Apps URL

Once the Static Web App is deployed, get its hostname:

```powershell
$swaHostname = az staticwebapp show `
  --name $swa `
  --resource-group $rg `
  --query "defaultHostname" `
  -o tsv

Write-Host "Website URL: https://$swaHostname"
```

Update the App Service CORS setting to the real URL:

```powershell
az webapp config appsettings set `
  --name $api `
  --resource-group $rg `
  --settings "Cors__Origins__0=https://$swaHostname"
```

Then update the `VITE_API_URL` GitHub secret if needed, and re-run the website workflow.

---

## Verification

```powershell
# API health check — should return 200 with Swagger UI
Start-Process "https://resto-api-skj26.azurewebsites.net/swagger"

# Seed login (first run creates the DB and seeds all tables)
$body = '{"email":"manager@resto.com","password":"password123"}'
Invoke-RestMethod -Uri "https://resto-api-skj26.azurewebsites.net/api/auth/login" `
  -Method Post -ContentType "application/json" -Body $body
```

> **First cold start takes 30–90 seconds** on the Free tier — `EnsureCreated()` + seeding runs on first request.

---

## Workflow summary

```
Push to main
  └── RestoAPI/** changed? → deploy-api.yml
        dotnet restore → build → test → publish → Azure App Service
  └── Website/** changed?  → deploy-website.yml
        npm ci → npm run build (VITE_API_URL injected) → Azure Static Web Apps
```

---

## Cost estimate (Free tier)

| Resource | SKU | Monthly cost |
|----------|-----|-------------|
| App Service | F1 (Free) | $0 |
| Azure SQL | Basic | ~$5 |
| Static Web Apps | Free | $0 |
| **Total** | | **~$5/mo** |

Upgrade App Service to B1 (~$13/mo) to add: custom domain, always-on (no cold starts), SSL.

---

## Teardown

```powershell
# Deletes everything — irreversible
az group delete --name rg-resto --yes --no-wait
```
