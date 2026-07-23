# Bağban AI web (Next.js 15). Prod: browser calls same-origin /api (nginx → api container),
# so NEXT_PUBLIC_API_BASE is empty at build/run.
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Phase 2 panel split — empty by default (middleware no-op); set to "panel.agradex.com" to activate.
# NEXT_PUBLIC_* must be present at build time to be inlined into the (edge) middleware bundle.
ARG NEXT_PUBLIC_PANEL_HOST=""
ENV NEXT_PUBLIC_PANEL_HOST=$NEXT_PUBLIC_PANEL_HOST
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["npm", "run", "start"]
