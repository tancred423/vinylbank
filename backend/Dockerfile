FROM denoland/deno:1.40.0
WORKDIR /app
COPY deno.json ./
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/
COPY src/ ./src/
RUN deno cache src/main.ts
RUN mkdir -p /app/uploads
EXPOSE 8000
CMD ["deno", "task", "start"]
