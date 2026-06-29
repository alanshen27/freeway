# Freeway — single image used for the web server, the BullMQ worker, and
# Prisma migrations (the command is overridden per service in compose).
FROM node:20-alpine AS base
WORKDIR /app
# openssl is required by Prisma; libc6-compat for some native deps.
RUN apk add --no-cache libc6-compat openssl

# ---- dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bring the full app (node_modules included) so the same image can run the web
# server, the tsx worker, and `prisma migrate deploy`.
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
