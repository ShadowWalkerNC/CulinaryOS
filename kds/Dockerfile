FROM oven/bun:1.1 AS base
WORKDIR /app

COPY shared/ ./shared/
COPY backend/middleware/ ./backend/middleware/

COPY kds/package.json ./kds/
RUN cd kds && bun install --frozen-lockfile

COPY kds/ ./kds/

EXPOSE 3002
CMD ["bun", "run", "kds/server/index.ts"]
