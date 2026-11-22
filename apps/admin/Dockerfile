FROM node:22-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Build args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TENANT_ID
ARG VITE_API_URL=/

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_TENANT_ID=$VITE_TENANT_ID
ENV VITE_API_URL=$VITE_API_URL

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/admin/package.json ./apps/admin/

RUN pnpm install --frozen-lockfile --filter @culinaryos/admin...

COPY apps/admin/ ./apps/admin/
RUN pnpm --filter @culinaryos/admin run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/admin/dist /app/apps/admin/dist
COPY --from=build /app/apps/admin/serve.mjs /app/apps/admin/serve.mjs
ENV PORT=3000
EXPOSE 3000
ENTRYPOINT ["node", "/app/apps/admin/serve.mjs"]
