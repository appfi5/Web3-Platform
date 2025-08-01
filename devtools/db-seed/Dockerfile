##### DEPENDENCIES

FROM --platform=linux/amd64 node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install Prisma Client - remove if not using Prisma
COPY drizzle ./drizzle
COPY src ./src
COPY tsconfig.json drizzle.config.ts package.json yarn.lock* package-lock.json* pnpm-lock.yaml\* ./

RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm i; \
    else echo "Lockfile not found." && exit 1; \
    fi

##### RUNNER

FROM --platform=linux/amd64 node:20-alpine AS runner
ARG DATABASE_URL
ARG AIRTABLE_BEARER_TOKEN
ARG AIRTABLE_BASE_ID
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/drizzle ./drizzle
COPY --from=deps /app/src ./src
COPY --from=deps /app/package.json ./
COPY --from=deps /app/drizzle.config.ts ./
COPY --from=deps /app/tsconfig.json ./

