# Build stage: compile the Spring Boot application with Java 21.
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# Runtime stage: run only the built jar in a smaller Java image.
FROM eclipse-temurin:21-jre

WORKDIR /app

ENV TZ=UTC

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Duser.timezone=UTC", "-jar", "app.jar"]
