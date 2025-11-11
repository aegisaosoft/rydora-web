@echo off
echo Fixing nginx container on QNAP...

echo Stopping and removing existing nginx container...
ssh orlovus@192.168.1.134 "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker stop rydora-nginx && /share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker rm rydora-nginx"

echo Creating new nginx container...
ssh orlovus@192.168.1.134 "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker run -d --name rydora-nginx -p 9443:80 nginx:alpine"

echo Writing nginx configuration...
ssh orlovus@192.168.1.134 "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker exec rydora-nginx sh -c 'echo \"server { listen 80; server_name localhost; location / { proxy_pass http://192.168.1.134:5000; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; } }\" > /etc/nginx/conf.d/default.conf'"

echo Restarting nginx...
ssh orlovus@192.168.1.134 "/share/ZFS530_DATA/.qpkg/container-station/usr/bin/docker restart rydora-nginx"

echo Done! Try accessing http://192.168.1.134:9443
pause

