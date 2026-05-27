# Run RestoAPI locally

Starts the ASP.NET Core API in Development mode (enables Swagger UI).

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --project "d:\Claude AI Projects\Restaurant App\RestoAPI\src\RestoAPI"
```

API will be available at: http://localhost:5000  
Swagger UI at: http://localhost:5000/swagger

**Seed credentials:**
- manager@resto.com / password123
- server@resto.com / password123
- cashier@resto.com / password123
- kitchen@resto.com / password123
