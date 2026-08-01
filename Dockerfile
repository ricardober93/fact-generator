FROM node:22 as app
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000
ENV DEBUG=wabot:*:error,wabot:*:warn,wabot:*:info
CMD ["npm", "start"]
