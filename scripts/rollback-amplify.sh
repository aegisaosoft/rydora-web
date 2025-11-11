#!/bin/bash

# Rydora AWS Amplify Rollback Script
# This script helps rollback to a previous deployment

set -e

# Configuration
AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-}"
AMPLIFY_BRANCH="${AMPLIFY_BRANCH:-main}"
AWS_REGION="${AWS_REGION:-us-east-1}"

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
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if AMPLIFY_APP_ID is set
    if [ -z "$AMPLIFY_APP_ID" ]; then
        log_error "AMPLIFY_APP_ID environment variable is required"
        log_info "You can set it by running: source .env.amplify"
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

# List recent deployments
list_deployments() {
    log_info "Fetching recent deployments..."
    
    # Get recent jobs
    aws amplify list-jobs \
        --app-id ${AMPLIFY_APP_ID} \
        --branch-name ${AMPLIFY_BRANCH} \
        --region ${AWS_REGION} \
        --max-results 10 \
        --query 'jobSummaries[*].[jobId,status,startTime,summary]' \
        --output table
    
    echo ""
    log_info "Recent deployments listed above"
}

# Get deployment details
get_deployment_details() {
    local job_id="$1"
    
    if [ -z "$job_id" ]; then
        log_error "Job ID is required"
        return 1
    fi
    
    log_info "Getting details for deployment: ${job_id}"
    
    aws amplify get-job \
        --app-id ${AMPLIFY_APP_ID} \
        --branch-name ${AMPLIFY_BRANCH} \
        --job-id ${job_id} \
        --region ${AWS_REGION}
}

# Rollback to specific deployment
rollback_deployment() {
    local job_id="$1"
    
    if [ -z "$job_id" ]; then
        log_error "Job ID is required for rollback"
        return 1
    fi
    
    log_info "Rolling back to deployment: ${job_id}"
    
    # Get the job details first
    JOB_DETAILS=$(aws amplify get-job \
        --app-id ${AMPLIFY_APP_ID} \
        --branch-name ${AMPLIFY_BRANCH} \
        --job-id ${job_id} \
        --region ${AWS_REGION})
    
    JOB_STATUS=$(echo "$JOB_DETAILS" | jq -r '.job.summary.status')
    
    if [ "$JOB_STATUS" != "SUCCEED" ]; then
        log_error "Cannot rollback to a failed deployment (Status: ${JOB_STATUS})"
        return 1
    fi
    
    # Start rollback job
    ROLLBACK_JOB_ID=$(aws amplify start-job \
        --app-id ${AMPLIFY_APP_ID} \
        --branch-name ${AMPLIFY_BRANCH} \
        --job-type "RELEASE" \
        --job-reason "Rollback to deployment ${job_id}" \
        --region ${AWS_REGION} \
        --query 'jobSummary.jobId' \
        --output text)
    
    if [ -z "$ROLLBACK_JOB_ID" ] || [ "$ROLLBACK_JOB_ID" = "None" ]; then
        log_error "Failed to start rollback job"
        return 1
    fi
    
    log_success "Rollback job started: ${ROLLBACK_JOB_ID}"
    log_info "You can monitor the progress in the AWS Amplify Console"
    
    # Wait for rollback to complete (optional)
    read -p "Do you want to wait for the rollback to complete? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        monitor_rollback "$ROLLBACK_JOB_ID"
    fi
}

# Monitor rollback progress
monitor_rollback() {
    local job_id="$1"
    
    log_info "Monitoring rollback progress..."
    
    while true; do
        JOB_STATUS=$(aws amplify get-job \
            --app-id ${AMPLIFY_APP_ID} \
            --branch-name ${AMPLIFY_BRANCH} \
            --job-id ${job_id} \
            --region ${AWS_REGION} \
            --query 'job.summary.status' \
            --output text)
        
        case "$JOB_STATUS" in
            "PENDING"|"PROVISIONING"|"DOWNLOADING"|"INSTALLING"|"BUILDING"|"DEPLOYING")
                log_info "Rollback in progress... Status: ${JOB_STATUS}"
                sleep 30
                ;;
            "SUCCEED")
                log_success "Rollback completed successfully!"
                break
                ;;
            "FAILED"|"CANCELLED")
                log_error "Rollback failed with status: ${JOB_STATUS}"
                break
                ;;
            *)
                log_warning "Unknown status: ${JOB_STATUS}"
                sleep 30
                ;;
        esac
    done
}

# Interactive rollback
interactive_rollback() {
    log_info "Starting interactive rollback process..."
    
    # List recent deployments
    list_deployments
    
    echo ""
    read -p "Enter the Job ID you want to rollback to: " JOB_ID
    
    if [ -z "$JOB_ID" ]; then
        log_error "Job ID cannot be empty"
        return 1
    fi
    
    # Confirm rollback
    echo ""
    log_warning "You are about to rollback to deployment: ${JOB_ID}"
    read -p "Are you sure you want to continue? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rollback_deployment "$JOB_ID"
    else
        log_info "Rollback cancelled"
    fi
}

# Create rollback summary
create_rollback_summary() {
    local job_id="$1"
    local rollback_job_id="$2"
    
    cat > rollback-summary.md << EOF
# Rydora Amplify Rollback Summary

## Rollback Information
- **Original Deployment ID**: ${job_id}
- **Rollback Job ID**: ${rollback_job_id}
- **Rollback Date**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- **Branch**: ${AMPLIFY_BRANCH}
- **Environment**: ${AMPLIFY_ENV:-prod}

## Rollback Details
- **Amplify App ID**: ${AMPLIFY_APP_ID}
- **AWS Region**: ${AWS_REGION}
- **Rollback Reason**: Manual rollback via script

## Next Steps
1. Verify the rollback in AWS Amplify Console
2. Test the application functionality
3. Monitor application logs and metrics
4. Investigate the cause of the original issue

## Prevention
To prevent similar issues in the future:
1. Implement proper testing in CI/CD pipeline
2. Use feature flags for gradual rollouts
3. Set up monitoring and alerting
4. Create automated rollback triggers

EOF
    
    log_success "Rollback summary created: rollback-summary.md"
}

# Main rollback function
main() {
    log_info "Starting Rydora AWS Amplify rollback process..."
    
    check_prerequisites
    
    case "${1:-interactive}" in
        "list")
            list_deployments
            ;;
        "rollback")
            if [ -z "$2" ]; then
                log_error "Job ID is required for rollback command"
                echo "Usage: $0 rollback <job-id>"
                exit 1
            fi
            rollback_deployment "$2"
            ;;
        "interactive")
            interactive_rollback
            ;;
        "monitor")
            if [ -z "$2" ]; then
                log_error "Job ID is required for monitor command"
                echo "Usage: $0 monitor <job-id>"
                exit 1
            fi
            monitor_rollback "$2"
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command] [job-id]"
            echo ""
            echo "Commands:"
            echo "  list        - List recent deployments"
            echo "  rollback    - Rollback to specific deployment (requires job-id)"
            echo "  interactive - Interactive rollback process (default)"
            echo "  monitor     - Monitor rollback progress (requires job-id)"
            echo "  help        - Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  AMPLIFY_APP_ID  - AWS Amplify App ID (required)"
            echo "  AMPLIFY_BRANCH  - Amplify branch name (default: main)"
            echo "  AWS_REGION      - AWS region (default: us-east-1)"
            echo ""
            echo "Examples:"
            echo "  $0 list                    # List recent deployments"
            echo "  $0 rollback 1234567890     # Rollback to specific deployment"
            echo "  $0 interactive             # Interactive rollback"
            echo "  $0 monitor 1234567890      # Monitor rollback progress"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

