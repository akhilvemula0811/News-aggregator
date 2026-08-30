# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy root configurations (necessary due to the 'file:..' link in subpackages)
COPY package.json package-lock.json ./
COPY backend/package*.json ./backend/

# Install dependencies using root context
RUN npm ci --prefix backend

# Copy source and prisma config
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
COPY backend/prisma ./backend/prisma
COPY backend/scripts ./backend/scripts

# Build backend
ARG DB_PROVIDER=sqlite
ENV DB_PROVIDER=$DB_PROVIDER
RUN npm run build --prefix backend

# Stage 2: Production Run
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package.json package-lock.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --prefix backend --only=production

# Copy built code and configuration
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma/client ./backend/node_modules/@prisma/client
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/scripts ./backend/scripts

EXPOSE 5000
ENV NODE_ENV=production

# Run database setup, clear mocks, and start server
CMD ["sh", "-c", "node backend/scripts/clear-mocks.js && npm run db:push --prefix backend && npm start --prefix backend"]
