#!/bin/bash

# Rydora Application Restart Script
# This script restarts the Rydora application with proper service management

set -e

# Configuration
SERVICE_NAME="${SERVICE_NAME:-rydora}"
APP_PORT="${APP_PORT:-5000}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/rydora}"
SERVER_DIR="${SERVER_DIR:-$DEPLOY_DIR/server}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Stop the application
stop_application() {
    log_info "ðŸ›‘ Stopping Rydora application..."
    
    # Check if service exists and is running
    if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
        log_info "Service $SERVICE_NAME is running, stopping..."
        systemctl stop $SERVICE_NAME
        sleep 5
        
        # Verify service is stopped
        if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
            log_warning "Service still running, force stopping..."
            systemctl kill $SERVICE_NAME 2>/dev/null || log_info "Service already stopped"
        fi
        log_success "Service $SERVICE_NAME stopped successfully"
    else
        log_info "Service $SERVICE_NAME is not running or doesn't exist"
    fi
    
    # Kill any remaining Node.js processes on the app port
    if lsof -ti:$APP_PORT >/dev/null 2>&1; then
        log_info "Killing processes on port $APP_PORT..."
        lsof -ti:$APP_PORT | xargs kill -9 2>/dev/null || log_info "No processes to kill"
        sleep 2
    fi
    
    log_success "Application stopped successfully"
}

# Start the application
start_application() {
    log_info "ðŸ”„ Starting Rydora application..."
    
    # Check if service file exists
    if [ ! -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
        log_error "Service file not found: /etc/systemd/system/$SERVICE_NAME.service"
        log_info "Creating default service file..."
        create_service_file
    fi
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    
    # Start the service
    systemctl start $SERVICE_NAME
    
    # Wait for service to start
    log_info "Waiting for service to start..."
    sleep 10
    
    # Check service status
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_success "Service $SERVICE_NAME started successfully"
    else
        log_error "Failed to start service $SERVICE_NAME"
        log_info "Service status:"
        systemctl status $SERVICE_NAME --no-pager
        exit 1
    fi
}

# Create default service file
create_service_file() {
    log_info "Creating default systemd service file..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Rydora Toll Management Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$SERVER_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF
    
    log_success "Default service file created"
}

# Health check
health_check() {
    log_info "ðŸ” Performing health check..."
    
    # Wait for application to be ready
    log_info "Waiting for application to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:$APP_PORT/health >/dev/null 2>&1; then
            log_success "Application is healthy and responding"
            return 0
        fi
        log_info "Attempt $i/30: Application not ready yet..."
        sleep 2
    done
    
    # Final health check
    if curl -f http://localhost:$APP_PORT/health >/dev/null 2>&1; then
        log_success "Application health check passed"
    else
        log_warning "Application health check failed, but service is running"
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    log_info "ðŸ” Verifying deployment..."
    
    # Check service status
    log_info "Service status:"
    systemctl status $SERVICE_NAME --no-pager -l
    
    # Check if port is listening
    if netstat -tlnp | grep ":$APP_PORT " >/dev/null; then
        log_success "Application is listening on port $APP_PORT"
    else
        log_error "Application is not listening on port $APP_PORT"
        return 1
    fi
    
    # Test application endpoints
    log_info "Testing application endpoints..."
    
    # Health endpoint
    if curl -f http://localhost:$APP_PORT/health >/dev/null 2>&1; then
        log_success "Health endpoint responding"
    else
        log_error "Health endpoint not responding"
    fi
    
    # Main application
    if curl -f http://localhost:$APP_PORT/ >/dev/null 2>&1; then
        log_success "Main application responding"
    else
        log_error "Main application not responding"
    fi
    
    # Check application logs
    log_info "Recent application logs:"
    journalctl -u $SERVICE_NAME --no-pager -n 20
    
    log_success "Deployment verification completed"
}

# Show service management commands
show_management_commands() {
    echo ""
    log_info "Service Management Commands:"
    echo "=============================="
    echo "â€¢ Check status: systemctl status $SERVICE_NAME"
    echo "â€¢ View logs: journalctl -u $SERVICE_NAME -f"
    echo "â€¢ Restart service: systemctl restart $SERVICE_NAME"
    echo "â€¢ Stop service: systemctl stop $SERVICE_NAME"
    echo "â€¢ Start service: systemctl start $SERVICE_NAME"
    echo "â€¢ Enable service: systemctl enable $SERVICE_NAME"
    echo "â€¢ Disable service: systemctl disable $SERVICE_NAME"
    echo ""
    echo "Application URL: http://your-server-ip:$APP_PORT"
    echo "Health Check: http://your-server-ip:$APP_PORT/health"
    echo ""
}

# Main restart function
restart_application() {
    log_info "Starting Rydora application restart process..."
    log_info "Service: $SERVICE_NAME"
    log_info "Port: $APP_PORT"
    log_info "Deploy Directory: $DEPLOY_DIR"
    
    stop_application
    start_application
    health_check
    verify_deployment
    show_management_commands
    
    log_success "ðŸŽ‰ Application restart completed successfully!"
}

# Handle script arguments
case "${1:-restart}" in
    "restart")
        check_permissions
        restart_application
        ;;
    "stop")
        check_permissions
        stop_application
        ;;
    "start")
        check_permissions
        start_application
        health_check
        ;;
    "status")
        systemctl status $SERVICE_NAME --no-pager
        ;;
    "logs")
        journalctl -u $SERVICE_NAME -f
        ;;
    "health")
        health_check
        ;;
    "verify")
        verify_deployment
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  restart  - Restart the application (default)"
        echo "  stop     - Stop the application"
        echo "  start    - Start the application"
        echo "  status   - Show service status"
        echo "  logs     - Show application logs"
        echo "  health   - Perform health check"
        echo "  verify   - Verify deployment"
        echo "  help     - Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  SERVICE_NAME  - Service name (default: rydora)"
        echo "  APP_PORT      - Application port (default: 5000)"
        echo "  DEPLOY_DIR    - Deployment directory (default: /var/www/rydora)"
        echo "  SERVER_DIR    - Server directory (default: \$DEPLOY_DIR/server)"
        echo ""
        echo "Examples:"
        echo "  $0 restart              # Restart the application"
        echo "  $0 stop                 # Stop the application"
        echo "  $0 start                # Start the application"
        echo "  $0 status               # Check service status"
        echo "  $0 logs                 # View application logs"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

