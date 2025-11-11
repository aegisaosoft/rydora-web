#!/bin/bash

# Rydora Deployment Script
# This script can be used for manual deployment or as a reference for Jenkins

set -e  # Exit on any error

# Configuration
NODE_VERSION="18"
DEPLOY_DIR="/var/www/rydora"
SERVER_DIR="/var/www/rydora/server"
SERVICE_NAME="rydora"
NGINX_SITE="rydora"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Install Node.js if not present
install_nodejs() {
    log "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        log "Installing Node.js ${NODE_VERSION}..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        log "Node.js is already installed: $(node --version)"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Root dependencies
    npm ci --only=production
    
    # Client dependencies
    cd client
    npm ci
    cd ..
}

# Build the application
build_application() {
    log "Building React application..."
    cd client
    npm run build
    cd ..
    log "Build completed successfully"
}

# Prepare server files
prepare_server() {
    log "Preparing server files..."
    
    # Create directories
    sudo mkdir -p ${SERVER_DIR}
    sudo mkdir -p ${SERVER_DIR}/public
    
    # Copy server files
    sudo cp -r server/* ${SERVER_DIR}/
    sudo cp package.json ${SERVER_DIR}/
    sudo cp package-lock.json ${SERVER_DIR}/ 2>/dev/null || warning "No package-lock.json found"
    
    # Copy client build
    sudo cp -r client/build/* ${SERVER_DIR}/public/
    
    log "Server files prepared in ${SERVER_DIR}"
}

# Install server dependencies
install_server_dependencies() {
    log "Installing server production dependencies..."
    cd ${SERVER_DIR}
    sudo npm ci --only=production
    cd - > /dev/null
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."
    
    sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Rydora Toll Management Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${SERVER_DIR}
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    log "Systemd service created"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        log "Installing Nginx..."
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/${NGINX_SITE} > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Serve static files
    location / {
        root ${SERVER_DIR}/public;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/${NGINX_SITE} /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    sudo nginx -t
    sudo systemctl reload nginx
    
    log "Nginx configured successfully"
}

# Deploy the application
deploy_application() {
    log "Deploying application..."
    
    # Set permissions
    sudo chown -R www-data:www-data ${SERVER_DIR}
    sudo chmod -R 755 ${SERVER_DIR}
    
    # Stop existing service
    sudo systemctl stop ${SERVICE_NAME} 2>/dev/null || warning "Service was not running"
    
    # Start the service
    sudo systemctl start ${SERVICE_NAME}
    sudo systemctl enable ${SERVICE_NAME}
    
    # Wait for service to start
    sleep 5
    
    # Check service status
    if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
        log "Service started successfully"
    else
        error "Failed to start service"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for application to be ready
    for i in {1..30}; do
        if curl -f http://localhost:5000/health > /dev/null 2>&1; then
            log "Application is healthy"
            break
        fi
        log "Waiting for application to start... (attempt $i/30)"
        sleep 2
    done
    
    # Test the main application
    if curl -f http://localhost/ > /dev/null 2>&1; then
        log "Application is accessible via Nginx"
    else
        warning "Application may not be accessible via Nginx"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up build artifacts..."
    rm -rf client/node_modules
    rm -rf client/build
    log "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting Rydora deployment..."
    
    check_root
    install_nodejs
    install_dependencies
    build_application
    prepare_server
    install_server_dependencies
    create_systemd_service
    configure_nginx
    deploy_application
    health_check
    cleanup
    
    log "âœ… Deployment completed successfully!"
    log "ðŸŒ Application is running at http://$(hostname -I | awk '{print $1}')/"
    log "ðŸ“Š Service status: sudo systemctl status ${SERVICE_NAME}"
    log "ðŸ“ Logs: sudo journalctl -u ${SERVICE_NAME} -f"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "restart")
        log "Restarting service..."
        sudo systemctl restart ${SERVICE_NAME}
        health_check
        ;;
    "stop")
        log "Stopping service..."
        sudo systemctl stop ${SERVICE_NAME}
        ;;
    "start")
        log "Starting service..."
        sudo systemctl start ${SERVICE_NAME}
        health_check
        ;;
    "status")
        sudo systemctl status ${SERVICE_NAME}
        ;;
    "logs")
        sudo journalctl -u ${SERVICE_NAME} -f
        ;;
    *)
        echo "Usage: $0 {deploy|restart|stop|start|status|logs}"
        echo "  deploy  - Full deployment (default)"
        echo "  restart - Restart the service"
        echo "  stop    - Stop the service"
        echo "  start   - Start the service"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs"
        exit 1
        ;;
esac

