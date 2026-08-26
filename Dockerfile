# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY facturacionrestaurante.client/package*.json ./
RUN npm ci
COPY facturacionrestaurante.client/ ./
RUN npm run build

# Stage 2: Build .NET Backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /app/server
COPY FacturacionRestaurante.Server/FacturacionRestaurante.Server.csproj ./
RUN dotnet restore
COPY FacturacionRestaurante.Server/ ./
# Copy built frontend assets to wwwroot of the server so dotnet publish includes them
COPY --from=frontend-build /app/client/dist ./wwwroot/
RUN dotnet publish -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=backend-build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false
EXPOSE 8080
ENTRYPOINT ["dotnet", "FacturacionRestaurante.Server.dll"]
