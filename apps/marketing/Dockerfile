FROM node:22-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/marketing/package.json ./apps/marketing/
RUN pnpm install --frozen-lockfile --filter @culinaryos/app-marketing...
COPY apps/marketing/ ./apps/marketing/
RUN pnpm --filter @culinaryos/app-marketing run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/marketing/out /app/apps/marketing/out
COPY --from=build /app/apps/marketing/serve.mjs /app/apps/marketing/serve.mjs
ENV PORT=3000
EXPOSE 3000
ENTRYPOINT ["node", "/app/apps/marketing/serve.mjs"]
