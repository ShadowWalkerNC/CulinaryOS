FROM node:20-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Build args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TENANT_ID
ARG VITE_POS_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_TENANT_ID=$VITE_TENANT_ID
ENV VITE_POS_URL=$VITE_POS_URL

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/pos/package.json ./apps/pos/

RUN pnpm install --frozen-lockfile --filter @culinaryos/app-pos

COPY apps/pos/ ./apps/pos/
RUN pnpm --filter @culinaryos/app-pos run build

FROM nginx:alpine
COPY --from=build /app/apps/pos/dist /usr/share/nginx/html
COPY apps/pos/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
