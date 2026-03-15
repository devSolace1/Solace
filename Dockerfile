# Solace V7 Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S solace -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=solace:nodejs /app/.next ./.next
COPY --from=builder --chown=solace:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=solace:nodejs /app/package.json ./package.json
COPY --from=builder --chown=solace:nodejs /app/public ./public

# Copy configuration and scripts
COPY --chown=solace:nodejs config/ ./config/
COPY --chown=solace:nodejs database/ ./database/
COPY --chown=solace:nodejs install/ ./install/
COPY --chown=solace:nodejs server/ ./server/

# Create necessary directories
RUN mkdir -p logs uploads backups
RUN chown -R solace:nodejs logs uploads backups

# Switch to non-root user
USER solace

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]