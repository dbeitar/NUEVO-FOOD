FROM node:20-alpine AS deps
WORKDIR /app
# Cuando el contexto de build es el root del repo, copiamos desde backend-nest
COPY backend-nest/package*.json ./ 
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend-nest/ ./
RUN npx tsc -p tsconfig.build.json

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY backend-nest/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8000
CMD ["node", "dist/main.js"]

