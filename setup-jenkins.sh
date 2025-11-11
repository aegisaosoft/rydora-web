#!/bin/bash
set -e

echo "ðŸš€ Setting up Jenkins with Node.js for Rydora project"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "âŒ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "âŒ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "âœ… Docker and Docker Compose found"

# Build custom Jenkins image with Node.js
echo "ðŸ”¨ Building custom Jenkins image with Node.js..."
docker build -f Dockerfile.jenkins -t RYDORA-jenkins:latest .

echo "âœ… Custom Jenkins image built successfully"

# Create jenkins_home directory with proper permissions
echo "ðŸ“ Creating Jenkins home directory..."
mkdir -p jenkins_home
sudo chown -R 1000:1000 jenkins_home

# Start Jenkins using Docker Compose
echo "ðŸš€ Starting Jenkins..."
docker-compose -f docker-compose.jenkins.yml up -d

echo "â³ Waiting for Jenkins to start..."
sleep 30

# Get initial admin password
if [ -f "jenkins_home/secrets/initialAdminPassword" ]; then
    echo "ðŸ”‘ Jenkins initial admin password:"
    cat jenkins_home/secrets/initialAdminPassword
    echo ""
fi

echo "âœ… Jenkins setup complete!"
echo ""
echo "ðŸŒ Access Jenkins at: http://localhost:8080"
echo "ðŸ“‹ Next steps:"
echo "   1. Open http://localhost:8080 in your browser"
echo "   2. Use the initial admin password shown above"
echo "   3. Install suggested plugins"
echo "   4. Create your first admin user"
echo "   5. Create a new Pipeline job pointing to your GitHub repository"
echo ""
echo "ðŸ”§ Jenkins includes:"
echo "   âœ… Node.js $(docker exec RYDORA-jenkins node --version)"
echo "   âœ… NPM $(docker exec RYDORA-jenkins npm --version)"
echo "   âœ… Git"
echo "   âœ… Required Jenkins plugins"

