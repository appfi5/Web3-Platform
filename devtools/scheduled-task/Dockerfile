##### DEPENDENCIES

FROM --platform=linux/amd64 node:20-alpine AS deps
WORKDIR /app
COPY *.* ./
COPY ./devtools/scheduled-task/sync-market.ts ./
COPY ./devtools/scheduled-task/statistics-asset-stats.ts ./
COPY ./src ./src
COPY devtools/scheduled-task/crontab /etc/crontabs/root

RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm i; \
    else echo "Lockfile not found." && exit 1; \
    fi

##### RUNNER
FROM --platform=linux/amd64 node:20-alpine AS runner
ARG DATABASE_URL
ARG COINMARKET_API_PREFIX
ARG COINMARKET_API_KEY
ARG UTXO_SWAP_API_PREFIX
ARG OMIGA_API_PREFIX
WORKDIR /app
COPY --from=deps /app/ ./
COPY devtools/scheduled-task/crontab /etc/crontabs/root
CMD ["crond", "-f"]
