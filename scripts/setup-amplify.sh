#!/bin/bash

# Rydora AWS Amplify Setup Script
# This script sets up the initial AWS Amplify project configuration

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="rydora"
ENVIRONMENT="prod"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Amplify CLI is installed
    if ! command -v amplify &> /dev/null; then
        log_info "Installing Amplify CLI..."
        npm install -g @aws-amplify/cli
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

# Create Amplify app
create_amplify_app() {
    log_info "Creating AWS Amplify app..."
    
    # Create the Amplify app
    APP_ID=$(aws amplify create-app \
        --name "${PROJECT_NAME}" \
        --description "Rydora Toll Management Platform" \
        --platform "WEB" \
        --repository "https://github.com/your-org/rydora-react" \
        --region ${AWS_REGION} \
        --query 'app.appId' \
        --output text)
    
    if [ -z "$APP_ID" ] || [ "$APP_ID" = "None" ]; then
        log_error "Failed to create Amplify app"
        exit 1
    fi
    
    log_success "Amplify app created with ID: ${APP_ID}"
    echo "AMPLIFY_APP_ID=${APP_ID}" > .env.amplify
    echo "export AMPLIFY_APP_ID=${APP_ID}" >> .env.amplify
}

# Create Amplify branch
create_amplify_branch() {
    log_info "Creating Amplify branch: main..."
    
    if [ -z "$APP_ID" ]; then
        log_error "APP_ID not found. Please create the app first."
        exit 1
    fi
    
    # Create the main branch
    aws amplify create-branch \
        --app-id ${APP_ID} \
        --branch-name "main" \
        --description "Main production branch" \
        --region ${AWS_REGION}
    
    log_success "Amplify branch 'main' created successfully!"
}

# Configure build settings
configure_build_settings() {
    log_info "Configuring build settings..."
    
    if [ -z "$APP_ID" ]; then
        log_error "APP_ID not found. Please create the app first."
        exit 1
    fi
    
    # Update build settings
    aws amplify update-app \
        --app-id ${APP_ID} \
        --region ${AWS_REGION} \
        --build-spec 'version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "Installing dependencies..."
        - cd client
        - npm ci
    build:
      commands:
        - echo "Building React application..."
        - npm run build
        - echo "Build completed successfully"
  artifacts:
    baseDirectory: client/build
    files:
      - "**/*"
  cache:
    paths:
      - client/node_modules/**/*
      - node_modules/**/*'
    
    log_success "Build settings configured successfully!"
}

# Set up custom domain (optional)
setup_custom_domain() {
    read -p "Do you want to set up a custom domain? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your custom domain (e.g., rydora.com): " CUSTOM_DOMAIN
        
        if [ -n "$CUSTOM_DOMAIN" ]; then
            log_info "Setting up custom domain: ${CUSTOM_DOMAIN}"
            
            # Create domain association
            aws amplify create-domain-association \
                --app-id ${APP_ID} \
                --domain-name ${CUSTOM_DOMAIN} \
                --region ${AWS_REGION} \
                --sub-domain-settings branchName=main,prefix=www \
                --sub-domain-settings branchName=main,prefix=""
            
            log_success "Custom domain configured: ${CUSTOM_DOMAIN}"
            log_warning "Note: You'll need to update your DNS records as shown in the Amplify Console"
        fi
    fi
}

# Create environment file
create_env_file() {
    log_info "Creating environment configuration file..."
    
    cat > .env.amplify << EOF
# AWS Amplify Configuration
AMPLIFY_APP_ID=${APP_ID}
AMPLIFY_BRANCH=main
AMPLIFY_ENV=${ENVIRONMENT}
AWS_REGION=${AWS_REGION}

# Build Configuration
NODE_ENV=production
REACT_APP_ENV=production

# API Configuration (update these with your actual values)
REACT_APP_API_URL=https://your-api-gateway-url.amazonaws.com/prod
REACT_APP_GRAPHQL_URL=https://your-appsync-url.appsync-api.${AWS_REGION}.amazonaws.com/graphql
REACT_APP_GRAPHQL_API_KEY=your-appsync-api-key

# Authentication (if using Cognito)
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_WEB_CLIENT_ID=your-user-pool-client-id
REACT_APP_IDENTITY_POOL_ID=your-identity-pool-id

# Storage (if using S3)
REACT_APP_S3_BUCKET=your-s3-bucket-name
REACT_APP_S3_REGION=${AWS_REGION}
EOF
    
    log_success "Environment file created: .env.amplify"
}

# Create deployment configuration
create_deployment_config() {
    log_info "Creating deployment configuration..."
    
    # Create amplify.yml if it doesn't exist
    if [ ! -f "amplify.yml" ]; then
        cat > amplify.yml << 'EOF'
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "Installing dependencies..."
        - cd client
        - npm ci
    build:
      commands:
        - echo "Building React application..."
        - npm run build
        - echo "Build completed successfully"
  artifacts:
    baseDirectory: client/build
    files:
      - '**/*'
  cache:
    paths:
      - client/node_modules/**/*
      - node_modules/**/*
EOF
        log_success "amplify.yml created"
    fi
    
    # Create .amplifyrc if it doesn't exist
    if [ ! -f ".amplifyrc" ]; then
        cat > .amplifyrc << EOF
{
  "projectPath": ".",
  "defaultEditor": "code",
  "envName": "${ENVIRONMENT}"
}
EOF
        log_success ".amplifyrc created"
    fi
}

# Display setup summary
display_summary() {
    log_success "ðŸŽ‰ AWS Amplify setup completed successfully!"
    echo ""
    echo "Setup Summary:"
    echo "=============="
    echo "App ID: ${APP_ID}"
    echo "Region: ${AWS_REGION}"
    echo "Branch: main"
    echo "Environment: ${ENVIRONMENT}"
    echo ""
    echo "Next Steps:"
    echo "==========="
    echo "1. Source the environment file: source .env.amplify"
    echo "2. Run the deployment script: ./scripts/deploy-amplify.sh"
    echo "3. Check the AWS Amplify Console for your app"
    echo "4. Update the environment variables in .env.amplify with your actual values"
    echo ""
    echo "Useful Commands:"
    echo "================"
    echo "â€¢ View app: aws amplify get-app --app-id ${APP_ID} --region ${AWS_REGION}"
    echo "â€¢ List branches: aws amplify list-branches --app-id ${APP_ID} --region ${AWS_REGION}"
    echo "â€¢ View jobs: aws amplify list-jobs --app-id ${APP_ID} --branch-name main --region ${AWS_REGION}"
    echo ""
}

# Main setup function
main() {
    log_info "Starting AWS Amplify setup for Rydora..."
    
    check_prerequisites
    create_amplify_app
    create_amplify_branch
    configure_build_settings
    setup_custom_domain
    create_env_file
    create_deployment_config
    display_summary
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "check")
        check_prerequisites
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup   - Full AWS Amplify setup (default)"
        echo "  check   - Check prerequisites only"
        echo "  help    - Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  AWS_REGION  - AWS region (default: us-east-1)"
        echo "  PROJECT_NAME - Project name (default: rydora)"
        echo "  ENVIRONMENT  - Environment name (default: prod)"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

