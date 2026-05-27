FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["src/RestoAPI/RestoAPI.csproj", "src/RestoAPI/"]
RUN dotnet restore "src/RestoAPI/RestoAPI.csproj"
COPY . .
RUN dotnet publish "src/RestoAPI/RestoAPI.csproj" -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RestoAPI.dll"]
