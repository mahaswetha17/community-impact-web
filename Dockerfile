# Step 1: Build the Angular app
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration=production

# Step 2: Serve the app using Nginx
FROM nginx:alpine
COPY --from=build /app/dist/community-impact-web /usr/share/nginx/html

# This part is crucial for Cloud Run:
# 1. We EXPOSE 8080 (the default Cloud Run port)
# 2. we use 'sed' to update the Nginx default config to listen on $PORT
EXPOSE 8080
CMD ["sh", "-c", "sed -i 's/listen[[:space:]]*80;/listen '\"$PORT\"';/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]