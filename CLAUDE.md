# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent projects share this workspace:

| Folder | Stack | Purpose |
|--------|-------|---------|
| `Android/` | Expo SDK 56, React Native 0.85.3, React 19, TypeScript | Mobile + web POS frontend |
| `RestoAPI/` | ASP.NET Core 9, EF Core 9, SQL Server | REST API backend |

---

## Android app

### Commands

```powershell
cd Android
npm install          # first time only
npx expo start       # Metro bundler (web/Expo Go)
npx expo run:android # build + deploy to connected device
```

**Release APK** (arm64-v8a only, runs without Metro):
```powershell
cd Android/android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

Install to connected device over ADB:
```powershell
adb install Android/android/app/build/outputs/apk/release/app-release.apk
```

### Architecture

`App.tsx` wraps everything in `SafeAreaProvider` → `GestureHandlerRootView` → `AuthProvider` → `AppNavigator`.

**Auth flow** (`src/context/AuthContext.tsx`): Role is selected at login; `rolePermissions` maps each role to the tab names it can see. `AppNavigator` filters `Tab.Screen` entries against `user.role` — no separate route guards anywhere else.

**Role → visible tabs:**
- `manager` — Dashboard, Tables, Orders, Billing, Kitchen, Menu
- `server` — Tables, Orders
- `cashier` — Billing, Orders
- `kitchen` — Kitchen

**Safe area**: Every screen uses `useSafeAreaInsets()` for `paddingTop` — the app runs with `edgeToEdgeEnabled=true` so content goes behind the status bar by default. The shared `ScreenHeader` component in `src/components/ScreenHeader.tsx` handles this automatically; use it for new screens.

**Static data**: All screens currently read from `src/data/mockData.ts`. When wiring to the API, replace these imports with fetch calls — the mock data shapes match the API DTOs exactly.

**Theme**: All colours live in `src/theme/colors.ts`. Do not hardcode hex values in screens.

### Key Gradle settings (`android/gradle.properties`)

- `reactNativeArchitectures=arm64-v8a` — single ABI, intentional (reduces APK size and build time)
- `org.gradle.jvmargs=-Xmx1g` — **no MaxMetaspaceSize cap** — removing that cap fixed OOM errors on this machine; do not add it back
- `edgeToEdgeEnabled=true` — requires safe area handling in every screen

---

## RestoAPI

### Commands

```powershell
cd RestoAPI

# Run (Development mode enables Swagger UI)
$env:ASPNETCORE_ENVIRONMENT="Development"; dotnet run --project src/RestoAPI

# Build
dotnet build src/RestoAPI/RestoAPI.csproj

# All tests
dotnet test tests/RestoAPI.Tests/RestoAPI.Tests.csproj

# Single test class
dotnet test tests/RestoAPI.Tests/RestoAPI.Tests.csproj --filter "FullyQualifiedName~BillingServiceTests"
```

Swagger UI: `http://localhost:5000/swagger`

### Database

SQL Server 2022 on `localhost`, Windows Authentication (`Trusted_Connection=True`). EF Core calls `db.Database.EnsureCreated()` + `SeedData.SeedAsync()` on startup — the database and all tables are created automatically on first run. No migrations needed for local dev.

**Seeded accounts** (password: `password123`):
`manager@resto.com`, `server@resto.com`, `cashier@resto.com`, `kitchen@resto.com`

### Architecture

Each domain follows the same pattern: `Model` → `DbContext` → `Service (interface + impl)` → `Controller`. No repositories — services query `AppDbContext` directly.

**Order lifecycle state machine:**
```
pending → preparing → ready   (kitchen item statuses, enforced in KitchenService)
active → ready → billing → paid / cancelled   (order status)
available → occupied → billing → dirty → available   (table status)
```
`KitchenService.UpdateItemStatusAsync` throws `InvalidOperationException` on invalid transitions (e.g. pending → ready). `BillingService.ProcessPaymentAsync` throws on insufficient cash.

**Billing formula**: subtotal × 5% tax + subtotal × 5% service charge. Discount applies before tax. Price snapshots (`MenuItemName`, `MenuItemPrice`) are stored on `OrderItem` at creation time so historical bills are never affected by menu price changes.

**JWT**: 12-hour expiry, claims: `sub` (userId), `email`, `role`, `name`. `serverId` for new orders is read from `ClaimTypes.NameIdentifier` — never passed in the request body.

**Role enforcement** mirrors the frontend exactly:
- `manager` — all endpoints
- `server` / `cashier` — create/update orders, send to kitchen
- `cashier` / `manager` — process payments
- `kitchen` / `manager` — advance kitchen item status

**Tests** use `Microsoft.EntityFrameworkCore.InMemory` — no real database needed. Each test creates its own in-memory DB with a `Guid` name to ensure isolation.
