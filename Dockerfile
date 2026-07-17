FROM node:20-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

# Keep container running
CMD ["npm", "start"]
