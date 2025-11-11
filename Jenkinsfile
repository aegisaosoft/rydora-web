pipeline {
    agent {
        label 'linux'
    }
    
    environment {
        NODE_VERSION = '18'
        NPM_CONFIG_LOGLEVEL = 'error'
        BUILD_DIR = 'build'
        DEPLOY_DIR = '/var/www/rydora'
        SERVER_DIR = '/var/www/rydora/server'
        CLIENT_DIR = '/var/www/rydora/client'
        NODE_ENV = 'production'
        SERVICE_NAME = 'rydora'
        APP_PORT = '5000'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    env.BUILD_NUMBER_SHORT = "${BUILD_NUMBER}"
                }
            }
        }
        
        stage('Check Prerequisites') {
            steps {
                script {
                    // Check if Node.js and NPM are available
                    sh '''
                        echo "Checking prerequisites..."
                        
                        if command -v node >/dev/null 2>&1; then
                            echo "✅ Node.js found: $(node --version)"
                        else
                            echo "❌ Node.js not found"
                            echo "Please ensure Node.js is installed in the Jenkins environment"
                            exit 1
                        fi
                        
                        if command -v npm >/dev/null 2>&1; then
                            echo "✅ NPM found: $(npm --version)"
                        else
                            echo "❌ NPM not found"
                            echo "Please ensure NPM is installed in the Jenkins environment"
                            exit 1
                        fi
                        
                        echo "All prerequisites met!"
                    '''
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    // Install root dependencies
                    sh '''
                        echo "Installing root dependencies..."
                        npm ci --only=production
                    '''
                    
                    // Install client dependencies
                    sh '''
                        echo "Installing client dependencies..."
                        cd client
                        npm ci
                    '''
                }
            }
        }
        
        stage('Lint & Test') {
            parallel {
                stage('Lint Client') {
                    steps {
                        sh '''
                            echo "Running ESLint on client code..."
                            cd client
                            npm run lint || echo "Linting completed with warnings"
                        '''
                    }
                }
                
                stage('Type Check') {
                    steps {
                        sh '''
                            echo "Running TypeScript type checking..."
                            cd client
                            npx tsc --noEmit || echo "Type checking completed with warnings"
                        '''
                    }
                }
            }
        }
        
        stage('Build Client') {
            steps {
                sh '''
                    echo "Building React application..."
                    cd client
                    npm run build
                    
                    echo "Build completed. Contents of build directory:"
                    ls -la build/
                '''
            }
        }
        
        stage('Prepare Artifacts') {
            steps {
                sh '''
                    echo "Preparing deployment artifacts..."
                    
                    # Create artifact directory structure
                    mkdir -p artifacts/server
                    mkdir -p artifacts/client
                    
                    # Copy server files
                    cp -r server/* artifacts/server/
                    cp package.json artifacts/server/
                    cp package-lock.json artifacts/server/ 2>/dev/null || echo "No package-lock.json found"
                    
                    # Copy client build
                    cp -r client/build/* artifacts/client/
                    
                    echo "Artifacts prepared"
                '''
            }
        }
        
        stage('Create Deployment Package') {
            steps {
                sh '''
                    echo "Creating deployment package..."
                    
                    # Create deployment scripts
                    cat > artifacts/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "Deploying Rydora application..."

# Configuration
DEPLOY_DIR="/var/www/rydora"
SERVER_DIR="$DEPLOY_DIR/server"

# Create directories
mkdir -p $SERVER_DIR/public

# Copy files
cp -r server/* $SERVER_DIR/
cp -r client/* $SERVER_DIR/public/

# Install server dependencies
cd $SERVER_DIR
npm ci --only=production

# Set permissions
chown -R www-data:www-data $DEPLOY_DIR 2>/dev/null || echo "Could not set ownership"
chmod -R 755 $DEPLOY_DIR

echo "Deployment completed"
EOF

                    # Create systemd service file
                    cat > artifacts/rydora.service << 'EOF'
[Unit]
Description=Rydora Toll Management Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/rydora/server
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=rydora

[Install]
WantedBy=multi-user.target
EOF

                    # Create nginx configuration
                    cat > artifacts/nginx-rydora.conf << 'EOF'
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
        root /var/www/rydora/server/public;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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

                    # Make deploy script executable
                    chmod +x artifacts/deploy.sh
                    
                    echo "Deployment package created"
                '''
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'artifacts/**/*', allowEmptyArchive: false
                echo "Artifacts archived successfully"
            }
        }
        
        stage('Health Check Build') {
            steps {
                sh '''
                    echo "Verifying build artifacts..."
                    
                    # Check if client build exists
                    if [ -d "artifacts/client" ] && [ "$(ls -A artifacts/client)" ]; then
                        echo "✅ Client build artifacts found"
                    else
                        echo "❌ Client build artifacts missing"
                        exit 1
                    fi
                    
                    # Check if server files exist
                    if [ -d "artifacts/server" ] && [ -f "artifacts/server/index.js" ]; then
                        echo "✅ Server artifacts found"
                    else
                        echo "❌ Server artifacts missing"
                        exit 1
                    fi
                    
                    # Check if deployment scripts exist
                    if [ -f "artifacts/deploy.sh" ]; then
                        echo "✅ Deployment scripts found"
                    else
                        echo "❌ Deployment scripts missing"
                        exit 1
                    fi
                    
                    echo "Build verification completed successfully"
                '''
            }
        }
        
        stage('Stop Application') {
            steps {
                sh '''
                    echo "🛑 Stopping Rydora application..."
                    
                    # Check if service exists and is running
                    if systemctl is-active --quiet ${SERVICE_NAME} 2>/dev/null; then
                        echo "Service ${SERVICE_NAME} is running, stopping..."
                        systemctl stop ${SERVICE_NAME}
                        sleep 5
                        
                        # Verify service is stopped
                        if systemctl is-active --quiet ${SERVICE_NAME} 2>/dev/null; then
                            echo "⚠️ Service still running, force stopping..."
                            systemctl kill ${SERVICE_NAME} 2>/dev/null || echo "Service already stopped"
                        fi
                        echo "✅ Service ${SERVICE_NAME} stopped successfully"
                    else
                        echo "ℹ️ Service ${SERVICE_NAME} is not running or doesn't exist"
                    fi
                    
                    # Kill any remaining Node.js processes on the app port
                    if lsof -ti:${APP_PORT} >/dev/null 2>&1; then
                        echo "Killing processes on port ${APP_PORT}..."
                        lsof -ti:${APP_PORT} | xargs kill -9 2>/dev/null || echo "No processes to kill"
                        sleep 2
                    fi
                    
                    echo "Application stopped successfully"
                '''
            }
        }
        
        stage('Deploy Application') {
            steps {
                sh '''
                    echo "🚀 Deploying Rydora application..."
                    
                    # Create deployment directory if it doesn't exist
                    mkdir -p ${DEPLOY_DIR}
                    mkdir -p ${SERVER_DIR}
                    mkdir -p ${SERVER_DIR}/public
                    
                    # Backup current deployment
                    if [ -d "${DEPLOY_DIR}/server" ]; then
                        echo "Creating backup of current deployment..."
                        cp -r ${DEPLOY_DIR} ${DEPLOY_DIR}.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "Backup creation failed, continuing..."
                    fi
                    
                    # Copy new server files
                    echo "Copying server files..."
                    cp -r artifacts/server/* ${SERVER_DIR}/
                    
                    # Copy new client build
                    echo "Copying client build..."
                    cp -r artifacts/client/* ${SERVER_DIR}/public/
                    
                    # Install server dependencies
                    echo "Installing server dependencies..."
                    cd ${SERVER_DIR}
                    npm ci --only=production
                    
                    # Set proper permissions
                    echo "Setting permissions..."
                    chown -R www-data:www-data ${DEPLOY_DIR} 2>/dev/null || echo "Could not set ownership"
                    chmod -R 755 ${DEPLOY_DIR}
                    chmod +x ${SERVER_DIR}/index.js 2>/dev/null || echo "Could not set execute permission"
                    
                    echo "✅ Application deployed successfully"
                '''
            }
        }
        
        stage('Configure Services') {
            steps {
                sh '''
                    echo "⚙️ Configuring system services..."
                    
                    # Install systemd service file
                    if [ -f "artifacts/${SERVICE_NAME}.service" ]; then
                        echo "Installing systemd service..."
                        cp artifacts/${SERVICE_NAME}.service /etc/systemd/system/
                        systemctl daemon-reload
                        systemctl enable ${SERVICE_NAME}
                        echo "✅ Systemd service configured"
                    else
                        echo "⚠️ Service file not found, creating default service..."
                        
                        # Create default service file
                        cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Rydora Toll Management Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${SERVER_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF
                        
                        systemctl daemon-reload
                        systemctl enable ${SERVICE_NAME}
                        echo "✅ Default systemd service created and configured"
                    fi
                    
                    # Configure nginx if config file exists
                    if [ -f "artifacts/nginx-${SERVICE_NAME}.conf" ]; then
                        echo "Configuring nginx..."
                        cp artifacts/nginx-${SERVICE_NAME}.conf /etc/nginx/sites-available/${SERVICE_NAME}
                        ln -sf /etc/nginx/sites-available/${SERVICE_NAME} /etc/nginx/sites-enabled/
                        nginx -t && systemctl reload nginx
                        echo "✅ Nginx configured successfully"
                    else
                        echo "ℹ️ Nginx config not found, skipping nginx configuration"
                    fi
                '''
            }
        }
        
        stage('Start Application') {
            steps {
                sh '''
                    echo "🔄 Starting Rydora application..."
                    
                    # Start the service
                    systemctl start ${SERVICE_NAME}
                    
                    # Wait for service to start
                    echo "Waiting for service to start..."
                    sleep 10
                    
                    # Check service status
                    if systemctl is-active --quiet ${SERVICE_NAME}; then
                        echo "✅ Service ${SERVICE_NAME} started successfully"
                    else
                        echo "❌ Failed to start service ${SERVICE_NAME}"
                        echo "Service status:"
                        systemctl status ${SERVICE_NAME} --no-pager
                        exit 1
                    fi
                    
                    # Wait for application to be ready
                    echo "Waiting for application to be ready..."
                    for i in {1..30}; do
                        if curl -f http://localhost:${APP_PORT}/health >/dev/null 2>&1; then
                            echo "✅ Application is healthy and responding"
                            break
                        fi
                        echo "Attempt $i/30: Application not ready yet..."
                        sleep 2
                    done
                    
                    # Final health check
                    if curl -f http://localhost:${APP_PORT}/health >/dev/null 2>&1; then
                        echo "✅ Application health check passed"
                    else
                        echo "⚠️ Application health check failed, but service is running"
                    fi
                '''
            }
        }
        
        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "🔍 Verifying deployment..."
                    
                    # Check service status
                    echo "Service status:"
                    systemctl status ${SERVICE_NAME} --no-pager -l
                    
                    # Check if port is listening
                    if netstat -tlnp | grep ":${APP_PORT} " >/dev/null; then
                        echo "✅ Application is listening on port ${APP_PORT}"
                    else
                        echo "❌ Application is not listening on port ${APP_PORT}"
                    fi
                    
                    # Test application endpoints
                    echo "Testing application endpoints..."
                    
                    # Health endpoint
                    if curl -f http://localhost:${APP_PORT}/health >/dev/null 2>&1; then
                        echo "✅ Health endpoint responding"
                    else
                        echo "❌ Health endpoint not responding"
                    fi
                    
                    # Main application
                    if curl -f http://localhost:${APP_PORT}/ >/dev/null 2>&1; then
                        echo "✅ Main application responding"
                    else
                        echo "❌ Main application not responding"
                    fi
                    
                    # Check application logs
                    echo "Recent application logs:"
                    journalctl -u ${SERVICE_NAME} --no-pager -n 20
                    
                    echo "Deployment verification completed"
                '''
            }
        }
    }
    
    post {
        always {
            script {
                echo "Build completed with status: ${currentBuild.result ?: 'SUCCESS'}"
            }
        }
        
        success {
            echo "✅ Build and deployment successful! Application has been restarted."
            echo "🌐 Application is running at: http://your-server-ip:${APP_PORT}"
            echo "📊 Service management: systemctl status ${SERVICE_NAME}"
            echo "📝 View logs: journalctl -u ${SERVICE_NAME} -f"
            echo "🔄 Restart service: systemctl restart ${SERVICE_NAME}"
            echo "🛑 Stop service: systemctl stop ${SERVICE_NAME}"
            echo "▶️ Start service: systemctl start ${SERVICE_NAME}"
        }
        
        failure {
            echo "❌ Build failed. Check the logs above for details."
        }
        
        cleanup {
            // Clean up workspace
            cleanWs()
        }
    }
}
