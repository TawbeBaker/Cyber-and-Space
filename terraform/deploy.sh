#!/bin/bash

# Asteroid Impact Simulator - Azure Deployment Script
# This script deploys the application to Azure using Terraform

set -e  # Exit on error

echo "🚀 Asteroid Impact Simulator - Azure Deployment"
echo "================================================"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    echo "   Visit: https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    echo "   Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check Azure login
echo ""
echo "🔐 Checking Azure authentication..."
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to Azure subscription: $SUBSCRIPTION"

# Navigate to terraform directory
cd "$(dirname "$0")"

echo ""
echo "📦 Step 1: Initialize Terraform"
terraform init

echo ""
echo "📋 Step 2: Validate Terraform configuration"
terraform validate

echo ""
echo "📊 Step 3: Plan infrastructure changes"
terraform plan -out=tfplan

echo ""
read -p "❓ Do you want to apply these changes? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🏗️  Step 4: Apply infrastructure changes"
terraform apply tfplan

echo ""
echo "📤 Step 5: Build and push Docker image"
echo ""

# Get outputs
ACR_LOGIN_SERVER=$(terraform output -raw container_registry_login_server)
ACR_NAME=$(terraform output -raw container_registry_name)

echo "Container Registry: $ACR_LOGIN_SERVER"

# Login to ACR
echo "Logging in to Azure Container Registry..."
az acr login --name $ACR_NAME

# Build and push API image
cd ../api
echo ""
echo "Building API Docker image..."
docker build -t $ACR_LOGIN_SERVER/space-challenge/api-spacechallenge:latest .

echo ""
echo "Pushing image to ACR..."
docker push $ACR_LOGIN_SERVER/space-challenge/api-spacechallenge:latest

echo ""
echo "✅ API deployed successfully!"

# Build frontend
cd ../web
echo ""
echo "📦 Step 6: Build frontend"
npm install
npm run build

echo ""
echo "✅ Frontend built successfully!"

# Get Static Web App deployment token
cd ../terraform
DEPLOYMENT_TOKEN=$(terraform output -raw deployment_token)
API_URL=$(terraform output -raw api_url)
WEB_URL=$(terraform output -raw web_url)

echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "🌐 API URL:  $API_URL"
echo "🌐 Web URL:  $WEB_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy frontend to Static Web App:"
echo "      cd ../web"
echo "      npx @azure/static-web-apps-cli deploy ./dist --deployment-token $DEPLOYMENT_TOKEN"
echo ""
echo "   2. Configure frontend environment:"
echo "      Set VITE_API_URL=$API_URL in Static Web App settings"
echo ""
echo "================================================"
