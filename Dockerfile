# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client for the target platform
RUN npx prisma generate
RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema + migrations
COPY --from=builder /app/prisma ./prisma

# PDF extraction script + its dependencies (not bundled by Next.js standalone)
COPY --from=builder /app/scripts ./scripts
COPY --from=deps /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=deps /app/node_modules/pdf-parse ./node_modules/pdf-parse

# Install prisma CLI globally so it has all its WASM files in the right place
RUN npm install -g prisma@6

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
