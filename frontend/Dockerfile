# syntax=docker/dockerfile:1
# Frontend (Next.js 14 App Router) — multi-stage standalone build.
# node:20-alpine is multi-arch, so this builds natively on ARM64 (Oracle Cloud A1/Ampere).
# Cross-build from x86: docker buildx build --platform linux/arm64 ...
# Build context = frontend/.  Build:
#   docker build -f frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.erpcore.tech/api/v1 \
#     --build-arg NEXT_PUBLIC_BASE_DOMAIN=erpcore.tech \
#     -t <registry>/erp-frontend:<tag> frontend

# ---- deps: install node_modules from the lockfile ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: produce .next/standalone ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* are inlined into the browser bundle at BUILD time, so the browser calls the
# real backend directly (the API is public, behind api.erpcore.tech). Override per environment.
ARG NEXT_PUBLIC_API_URL=https://api.erpcore.tech/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_DOMAIN=erpcore.tech
ENV NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime from the standalone output ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# NextAuth in production sets the cookie domain to .erpcore.tech and marks it __Secure-/secure
# (it keys off NODE_ENV=production), so subdomains share the session. Keep NODE_ENV=production.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
ENV PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# .next/standalone/server.js honours PORT + HOSTNAME.
CMD ["node", "server.js"]
