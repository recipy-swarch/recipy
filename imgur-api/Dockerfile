# Stage 1: build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiamos sólo el csproj para cachear restore
COPY ["imgur-api.csproj", "./"]
RUN dotnet restore "imgur-api.csproj"

# Copiamos todo y publicamos
COPY . .
RUN dotnet publish "imgur-api.csproj" -c Release -o /app/publish

# Stage 2: runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:80
EXPOSE 80

ENTRYPOINT ["dotnet", "imgur-api.dll"]