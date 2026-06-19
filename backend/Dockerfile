# CulinaryOS Backend — Dockerfile
# Multi-stage build: compile with Gradle, run with slim JRE

# Stage 1: Build
FROM gradle:8.11-jdk17 AS build
WORKDIR /app

# Copy gradle files first for layer caching
COPY settings.gradle.kts .
COPY build.gradle.kts .
COPY gradle/ gradle/
COPY shared/ shared/
COPY backend/ backend/

# Build the backend fat jar
RUN gradle :backend:buildFatJar --no-daemon --no-build-cache

# Stage 2: Run
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S culinary && adduser -S culinary -G culinary
USER culinary

COPY --from=build /app/backend/build/libs/*-all.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
