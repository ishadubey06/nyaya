FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port Vite runs on
EXPOSE 5173

# Start Vite with host flag so it's accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]
