FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_API_BASE_URL

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

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
