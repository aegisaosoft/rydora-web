#!/bin/bash

# Stop and remove existing nginx container
docker stop rydora-nginx 2>/dev/null || true
docker rm rydora-nginx 2>/dev/null || true

# Create nginx container with volume mount for config
docker run -d --name rydora-nginx \
  -p 9443:80 \
  -v /share/Container/container-station-data/lib/docker/volumes/nginx-config:/etc/nginx/conf.d \
  nginx:alpine

# Create the config directory if it doesn't exist
mkdir -p /share/Container/container-station-data/lib/docker/volumes/nginx-config

# Copy the nginx config
cat > /share/Container/container-station-data/lib/docker/volumes/nginx-config/default.conf << 'EOF'
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://192.168.1.134:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
EOF

# Restart nginx to load new config
docker restart rydora-nginx

echo "Nginx container setup complete. Access via http://192.168.1.134:9443"

