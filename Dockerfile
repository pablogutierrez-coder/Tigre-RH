FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci

COPY . .
RUN npm run build \
  && rm -rf backend/public \
  && mkdir -p backend/public \
  && cp -R dist/. backend/public/ \
  && npm --prefix backend run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci --omit=dev && npm cache clean --force

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/public ./backend/public

WORKDIR /app/backend
CMD ["node", "dist/index.js"]
