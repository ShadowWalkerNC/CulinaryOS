FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy root configs and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy all packages and shared libraries first to satisfy internal workspace dependencies
COPY packages/ ./packages/
COPY apps/server/package.json ./apps/server/

# Install only the backend dependencies
RUN pnpm install --frozen-lockfile --filter @culinaryos/server

# Copy server source code
COPY apps/server/ ./apps/server/

# Compile TypeScript
RUN pnpm --filter @culinaryos/server run build

EXPOSE 3000
CMD ["pnpm", "--filter", "@culinaryos/server", "start"]
