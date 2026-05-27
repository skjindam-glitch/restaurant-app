# Run API Tests

Runs all 13 xUnit tests for RestoAPI (AuthService, BillingService, KitchenService).

```powershell
dotnet test "d:\Claude AI Projects\Restaurant App\RestoAPI\tests\RestoAPI.Tests"
```

Run a single test class:
```powershell
dotnet test "d:\Claude AI Projects\Restaurant App\RestoAPI\tests\RestoAPI.Tests" --filter "FullyQualifiedName~AuthServiceTests"
dotnet test "d:\Claude AI Projects\Restaurant App\RestoAPI\tests\RestoAPI.Tests" --filter "FullyQualifiedName~BillingServiceTests"
dotnet test "d:\Claude AI Projects\Restaurant App\RestoAPI\tests\RestoAPI.Tests" --filter "FullyQualifiedName~KitchenServiceTests"
```

Run with verbose output:
```powershell
dotnet test "d:\Claude AI Projects\Restaurant App\RestoAPI\tests\RestoAPI.Tests" -v normal
```

**Test counts:** 4 Auth + 4 Billing + 3 Kitchen = 11 total (memory says 13 — verify with actual run)
