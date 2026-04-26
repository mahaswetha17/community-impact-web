# Step 1: Build the Angular app
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration=production

# Step 2: Serve the app using Nginx
FROM nginx:alpine
# Replace 'your-app-name' with the actual folder name in /dist
<<<<<<< HEAD
=======
# This path must match exactly what Angular produces
>>>>>>> 6ad288f0b77a52159f8dfa9891d54cb0a0ba4f4f
COPY --from=build /app/dist/community-impact-web/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
