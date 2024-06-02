FROM node:20
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install npm packages
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build
