FROM --platform=linux/amd64 node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY . .
# crontab
COPY devtools/scheduled-task/sync-market.ts ./
COPY devtools/scheduled-task/crontab /etc/crontabs/root
# api, dockerignore will ignore all [local] and tsx files, only API will be copied
COPY src/app/api ./src/app/api
# entrypoint
COPY devtools/entrypoint.sh ./

ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
ARG CKB_EXPLORER_API_PREFIX
ARG NEXT_PUBLIC_IS_MAINNET
ARG NEXT_PUBLIC_TRPC_API
ARG API_BUILD=true

RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm i; \
    else echo "Lockfile not found." && exit 1; \
    fi

RUN \
    if [ -f yarn.lock ]; then SKIP_ENV_VALIDATION=1 yarn build; \
    elif [ -f package-lock.json ]; then SKIP_ENV_VALIDATION=1 npm run build; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && SKIP_ENV_VALIDATION=1 pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

ENV NODE_ENV production

EXPOSE 3000

CMD ["./entrypoint.sh"]
