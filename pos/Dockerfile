FROM oven/bun:1.1 AS base
WORKDIR /app

COPY shared/ ./shared/
COPY backend/middleware/ ./backend/middleware/

COPY pos/package.json ./pos/
RUN cd pos && bun install --frozen-lockfile

COPY pos/ ./pos/

EXPOSE 3003
CMD ["bun", "run", "pos/server/index.ts"]
