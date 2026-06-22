FROM node:22-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output (run `npm run build` locally before deploying)
COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "dist/server-http.js"]
