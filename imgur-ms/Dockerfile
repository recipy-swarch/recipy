FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base

# volvemos a root para crear carpetas y asignar permisos
USER root
WORKDIR /app

RUN mkdir -p /app/wwwroot/uploads && chown -R $APP_UID:$APP_UID /app/wwwroot

# ahora asignamos de nuevo el usuario de la imagen base
USER $APP_UID

EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["imgur-ms.csproj", "."]
RUN dotnet restore "./imgur-ms.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "./imgur-ms.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./imgur-ms.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

VOLUME ["/app/wwwroot"]

ENTRYPOINT ["dotnet", "imgur-ms.dll"]