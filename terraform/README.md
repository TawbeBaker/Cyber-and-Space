# Asteroid Impact Simulator - Terraform Deployment

Ce dossier contient la configuration Terraform pour déployer l'application Asteroid Impact Simulator sur Microsoft Azure.

## 🏗️ Architecture

L'infrastructure déployée comprend :

- **Resource Group** : Groupe de ressources Azure pour organiser tous les composants
- **Log Analytics Workspace** : Pour la surveillance et les logs
- **Container Registry** : Pour stocker les images Docker de l'API
- **Container App Environment** : Environnement pour héberger les containers
- **Container App** : Application containerisée pour l'API Node.js
- **Static Web App** : Application web statique pour le frontend React

## 📋 Prérequis

1. **Terraform** (>= 1.0)
   ```bash
   brew install terraform  # macOS
   ```

2. **Azure CLI**
   ```bash
   brew install azure-cli  # macOS
   ```

3. **Docker** (pour builder les images)
   ```bash
   brew install docker  # macOS
   ```

4. **Compte Azure** avec permissions appropriées

## 🚀 Déploiement Automatique

### Option 1 : Script de déploiement (Recommandé)

```bash
cd terraform
./deploy.sh
```

Le script va :
1. ✅ Vérifier les prérequis
2. ✅ Initialiser Terraform
3. ✅ Créer l'infrastructure Azure
4. ✅ Builder et pusher l'image Docker de l'API
5. ✅ Builder le frontend
6. ✅ Fournir les instructions pour le déploiement final

### Option 2 : Déploiement manuel

#### Étape 1 : Se connecter à Azure

```bash
az login
```

#### Étape 2 : Initialiser Terraform

```bash
cd terraform
terraform init
```

#### Étape 3 : Planifier le déploiement

```bash
terraform plan
```

#### Étape 4 : Appliquer la configuration

```bash
terraform apply
```

#### Étape 5 : Builder et pusher l'image Docker

```bash
# Récupérer les informations du registry
ACR_LOGIN_SERVER=$(terraform output -raw container_registry_login_server)
ACR_NAME=$(terraform output -raw container_registry_name)

# Se connecter au registry
az acr login --name $ACR_NAME

# Builder et pusher l'image
cd ../api
docker build -t $ACR_LOGIN_SERVER/space-challenge/api-spacechallenge:latest .
docker push $ACR_LOGIN_SERVER/space-challenge/api-spacechallenge:latest
```

#### Étape 6 : Builder le frontend

```bash
cd ../web
npm install
npm run build
```

#### Étape 7 : Déployer le frontend

```bash
# Récupérer le token de déploiement
cd ../terraform
DEPLOYMENT_TOKEN=$(terraform output -raw deployment_token)

# Déployer sur Static Web App
cd ../web
npx @azure/static-web-apps-cli deploy ./dist --deployment-token $DEPLOYMENT_TOKEN
```

## 🔧 Configuration

### Variables personnalisables

Créez un fichier `terraform.tfvars` pour personnaliser la configuration :

```hcl
environment_name = "production"
location         = "eastus"
project_name     = "space-challenge-2025"
api_image_tag    = "v1.1"
```

### Variables disponibles

- `environment_name` : Nom de l'environnement (default: "production")
- `location` : Région Azure (default: "eastus")
- `project_name` : Nom du projet (default: "space-challenge-2025")
- `api_image_tag` : Tag de l'image Docker (default: "latest")

## 📊 Outputs

Après le déploiement, Terraform affiche :

- `api_url` : URL de l'API
- `web_url` : URL de l'application web
- `container_registry_login_server` : Serveur du registry Docker
- `deployment_token` : Token pour déployer sur Static Web App (sensible)

Pour voir les outputs :

```bash
terraform output
```

Pour voir un output spécifique :

```bash
terraform output api_url
```

## 🗑️ Destruction de l'infrastructure

Pour supprimer toutes les ressources Azure :

```bash
terraform destroy
```

⚠️ **Attention** : Cette action est irréversible et supprimera toutes les données.

## 📝 Notes

- Le Static Web App utilise le tier **Free** (gratuit)
- Le Container Registry utilise le SKU **Basic** (économique)
- Le Container App est configuré pour scaler de 1 à 10 instances
- Les logs sont conservés pendant 30 jours

## 🔒 Sécurité

- Les credentials du Container Registry sont stockés comme secrets
- Le deployment token du Static Web App est marqué comme sensible
- Les variables sensibles ne sont jamais affichées dans les logs

## 🐛 Dépannage

### Erreur : "Resource already exists"

Si des ressources existent déjà, importez-les ou supprimez-les manuellement.

### Erreur : "Not logged in to Azure"

```bash
az login
az account set --subscription "VOTRE_SUBSCRIPTION_ID"
```

### Erreur : "Docker build failed"

Vérifiez que Docker est en cours d'exécution :

```bash
docker ps
```

## 📚 Ressources

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
