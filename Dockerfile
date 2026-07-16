FROM node:20-alpine

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

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
