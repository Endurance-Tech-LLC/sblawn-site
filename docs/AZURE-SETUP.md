# Azure setup for sblawn-site (one-time)

Run once per subscription. Pipeline: `.github/workflows/ci-cd.yml` builds the image, pushes it to ACR, then updates the staging Container App, then production (after approval).

AWS mapping: ACR ≈ ECR, Container Apps ≈ ECS Fargate / App Runner, GitHub OIDC → Entra app federated credential ≈ GitHub OIDC → IAM role, GitHub environments ≈ CodePipeline stages with a manual approval action.

## 1. Variables

```bash
az login
az account set --subscription "<SUBSCRIPTION_ID>"

RG=rg-sblawn-web
LOC=eastus2
ACR=sblawnacr                      # globally unique, lowercase, no dashes
CAE=cae-sblawn
REPO=cstolps8/sblawn-site
```

## 2. Core resources

```bash
az group create -n $RG -l $LOC
az acr create -n $ACR -g $RG --sku Basic --admin-enabled false
az containerapp env create -n $CAE -g $RG -l $LOC

# Bootstrap image, built in Azure (no local Docker needed)
az acr build --registry $ACR --image sblawn-site:bootstrap .
```

## 3. Container Apps (staging and production)

```bash
for ENV_NAME in staging production; do
  az containerapp create -n ca-sblawn-$ENV_NAME -g $RG --environment $CAE \
    --image $ACR.azurecr.io/sblawn-site:bootstrap \
    --registry-server $ACR.azurecr.io --registry-identity system --system-assigned \
    --target-port 3000 --ingress external \
    --min-replicas 1 --max-replicas 3 --cpu 0.5 --memory 1Gi
done

# Let each app pull from ACR with its managed identity (no passwords)
ACR_ID=$(az acr show -n $ACR --query id -o tsv)
for ENV_NAME in staging production; do
  PRINCIPAL=$(az containerapp show -n ca-sblawn-$ENV_NAME -g $RG --query identity.principalId -o tsv)
  az role assignment create --assignee $PRINCIPAL --role AcrPull --scope $ACR_ID
done
```

If the first revision shows a pull error, wait a minute for role propagation and run `az containerapp update` again (the pipeline does this anyway on its next run).

## 4. Entra app for GitHub Actions (OIDC, no secrets)

```bash
APP_ID=$(az ad app create --display-name gh-sblawn-site --query appId -o tsv)
az ad sp create --id $APP_ID
SP_ID=$(az ad sp show --id $APP_ID --query id -o tsv)

az role assignment create --assignee $SP_ID --role AcrPush --scope $ACR_ID
az role assignment create --assignee $SP_ID --role Contributor \
  --scope $(az group show -n $RG --query id -o tsv)   # tighten to a custom role later

# Federated credentials: one for main (build job), one per GitHub environment (deploy jobs)
fed() {  # $1 = name, $2 = subject
  az ad app federated-credential create --id $APP_ID --parameters "{
    \"name\": \"$1\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"$2\",
    \"audiences\": [\"api://AzureADTokenExchange\"]}"
}
fed gh-main        "repo:$REPO:ref:refs/heads/main"
fed gh-env-staging "repo:$REPO:environment:staging"
fed gh-env-prod    "repo:$REPO:environment:production"

echo "AZURE_CLIENT_ID=$APP_ID"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)"
```

## 5. GitHub settings (repo: Settings)

Repository variables (Settings → Secrets and variables → Actions → Variables):

| Name | Value |
|---|---|
| `AZURE_CLIENT_ID` | from step 4 |
| `AZURE_TENANT_ID` | from step 4 |
| `AZURE_SUBSCRIPTION_ID` | from step 4 |
| `ACR_NAME` | `sblawnacr` |
| `ACR_LOGIN_SERVER` | `sblawnacr.azurecr.io` |

Environment variables (Settings → Environments; create `staging` and `production`):

| Name | staging | production |
|---|---|---|
| `AZURE_RESOURCE_GROUP` | `rg-sblawn-web` | `rg-sblawn-web` |
| `CONTAINERAPP_NAME` | `ca-sblawn-staging` | `ca-sblawn-production` |
| `SITE_URL` | staging URL (from `az containerapp show … --query properties.configuration.ingress.fqdn`) | `https://www.sblawnsystems.com` once the custom domain is cut over |

On the **production** environment, enable **Required reviewers** so deploys wait for approval.

## 6. First run

Push to `main`. The pipeline runs lint and build, pushes `sblawn-site:<sha>` to ACR, deploys staging, then waits for approval before production.

## Later

- Custom domain and managed TLS on the production Container App, then point DNS at it (part of the cutover in the plan).
- Replace Contributor with a custom role limited to `containerapps/write` and `registries/push`.
- Move images to Blob + CDN (`next.config.ts` remotePatterns) when media migrates.
