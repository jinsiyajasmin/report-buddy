# Stage 1: Build the application
FROM oven/bun:alpine AS builder
WORKDIR /app

# Copy package management files
COPY package.json bun.lock bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application (TanStack Start / Nitro build)
RUN bun run build

# Stage 2: Serve the application
FROM oven/bun:alpine AS runner
WORKDIR /app

# Copy built assets from builder
# Note: TanStack Start with Nitro usually outputs to .output or dist, 
# you might need to adjust this depending on the exact build output if it differs.
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./

# Expose port (Coolify usually maps this automatically, but standard is 3000 or 8080)
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Run the server
CMD ["bun", "run", ".output/server/index.mjs"]
