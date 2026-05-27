# Build RestoAPI

Compiles the API project and all its dependencies.

```powershell
dotnet build "d:\Claude AI Projects\Restaurant App\RestoAPI\src\RestoAPI"
```

Build the entire solution (API + Tests):
```powershell
dotnet build "d:\Claude AI Projects\Restaurant App\RestoAPI"
```

Restore NuGet packages first (if needed):
```powershell
dotnet restore "d:\Claude AI Projects\Restaurant App\RestoAPI"
```

**Key packages:**
- Microsoft.EntityFrameworkCore.SqlServer 9.0.4
- Microsoft.AspNetCore.Authentication.JwtBearer 9.0.4
- BCrypt.Net-Next 4.0.3
- Swashbuckle.AspNetCore 7.3.1
