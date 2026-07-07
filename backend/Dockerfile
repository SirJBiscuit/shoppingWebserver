FROM node:18-alpine

# Install git and docker CLI for system management
RUN apk add --no-cache git docker-cli

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
