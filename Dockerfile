# ── Stage 1: Build Frontend ─────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Build Backend & Production Runner ──────
FROM node:20-alpine
WORKDIR /app

# Copy root dependencies and prisma schema
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy backend source code
COPY . .

# Copy compiled frontend from client-builder into client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Generate Prisma client and compile backend TypeScript
RUN npx prisma generate
RUN npm run build:server

# Ensure data directory exists for persistent SQLite database
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
