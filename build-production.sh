#!/bin/bash

# Rydora Production Build Script for Azure Web App
# This script builds the production application for Azure deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Rydora Production Build Script ===${NC}"
echo -e "${BLUE}Building application for Azure Web App deployment${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm ci

# Build React client
echo -e "${BLUE}Building React client...${NC}"
cd client
npm ci
npm run build
cd ..

# Create deployment package
echo -e "${BLUE}Creating deployment package...${NC}"
mkdir -p deploy-package
cp -r server deploy-package/
cp -r client/build deploy-package/client/build
cp package.json deploy-package/
cp web.config deploy-package/

# Install production dependencies in deployment package
echo -e "${BLUE}Installing production dependencies...${NC}"
cd deploy-package
npm ci --only=production
cd ..

# Create zip file for deployment
echo -e "${BLUE}Creating deployment zip file...${NC}"
cd deploy-package
zip -r ../rydora-deployment.zip . -x "*.git*" "node_modules/*" "*.log"
cd ..

if [ $? -eq 0 ]; then
    echo -e "${GREEN}âœ“ Deployment package created successfully!${NC}"
    
    # Show package details
    PACKAGE_SIZE=$(du -h rydora-deployment.zip | cut -f1)
    echo -e "${GREEN}Package size: ${PACKAGE_SIZE}${NC}"
    
    echo -e "${GREEN}=== Build completed successfully! ===${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "1. Deploy to Azure Web App using GitHub Actions"
    echo -e "2. Or use Azure CLI: az webapp deploy --name RYDORA-web-us-2025 --resource-group RYDORA_web --src-path rydora-deployment.zip --type zip"
    echo -e "3. Check deployment status in Azure Portal"
    
    # Clean up
    rm -rf deploy-package
    
else
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
fi
