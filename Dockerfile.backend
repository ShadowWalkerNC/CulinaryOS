FROM oven/bun:1.1 AS base
WORKDIR /app

# Copy shared types
COPY shared/ ./shared/

# Install backend deps
COPY backend/package.json ./backend/
RUN cd backend && bun install --frozen-lockfile

COPY backend/ ./backend/

EXPOSE 3000
CMD ["bun", "run", "backend/server.ts"]
