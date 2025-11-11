#!/bin/bash
# Script to install Node.js in existing Jenkins container

echo "🔧 Installing Node.js in Jenkins container..."

# Get the Jenkins container ID
JENKINS_CONTAINER=$(docker ps --filter "ancestor=jenkins/jenkins" --format "{{.ID}}" | head -n 1)

if [ -z "$JENKINS_CONTAINER" ]; then
    echo "❌ Jenkins container not found. Make sure Jenkins is running."
    exit 1
fi

echo "✅ Found Jenkins container: $JENKINS_CONTAINER"

# Install Node.js in the container
echo "📦 Installing Node.js 18..."
docker exec -u root $JENKINS_CONTAINER bash -c "
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &&
    apt-get install -y nodejs &&
    node --version &&
    npm --version
"

if [ $? -eq 0 ]; then
    echo "✅ Node.js installed successfully!"
    echo "🚀 You can now run your Jenkins pipeline again."
else
    echo "❌ Failed to install Node.js"
    exit 1
fi
