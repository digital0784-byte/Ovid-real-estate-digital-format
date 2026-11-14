# Multi-stage production build for Digital Construction ERP System
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_RECAPTCHA_SITE_KEY=""
ARG VITE_APPCHECK_PROVIDER="v3"
ENV VITE_RECAPTCHA_SITE_KEY=${VITE_RECAPTCHA_SITE_KEY}
ENV VITE_APPCHECK_PROVIDER=${VITE_APPCHECK_PROVIDER}

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
