FROM oven/bun:1.1 AS base
WORKDIR /app

COPY shared/ ./shared/
COPY backend/middleware/ ./backend/middleware/

COPY recipeos/package.json ./recipeos/
RUN cd recipeos && bun install --frozen-lockfile

COPY recipeos/ ./recipeos/

EXPOSE 3001
CMD ["bun", "run", "recipeos/server/index.ts"]
