# Azure setup for sblawn-site (one-time)

Run once per subscription. Two pipelines:

- **Production** (`.github/workflows/ci-cd.yml`): every merge to `main` runs lint/build, pushes `sblawn-site:<sha>` to ACR, then waits for approval and deploys `ca-sblawn-production`.
- **Staging, on demand** (`.github/workflows/staging.yml`): Actions → **Deploy to staging** → **Run workflow** → pick any branch. Builds `sblawn-site-staging:<sha>` and deploys `ca-sblawn-staging`.

Staging and production use **separate Azure logins**, so a branch deployed to staging can never reach production.

AWS mapping: ACR ≈ ECR, Container Apps ≈ ECS Fargate / App Runner, GitHub OIDC → Entra app federated credential ≈ GitHub OIDC → IAM role, GitHub environments ≈ CodePipeline stages with a manual approval action.

## 1. Variables

```bash
az login
az account set --subscription "<SUBSCRIPTION_ID>"

RG=rg-sblawn-web
LOC=eastus2
ACR=sblawnacr                      # globally unique, lowercase, no dashes
CAE=cae-sblawn
GH_REPO=Endurance-Tech-LLC/sblawn-site

# GitHub's OIDC token subject for this org uses immutable IDs:
#   repo:<owner>@<owner_id>/<repo>@<repo_id>:...
# Azure matches it exactly, so build the prefix from the GitHub API.
REPO=$(gh api repos/${GH_REPO} --jq '"\(.owner.login)@\(.owner.id)/\(.name)@\(.id)"')
echo "${REPO}"   # Endurance-Tech-LLC@351724005/sblawn-site@1441175438
```

> **zsh (macOS default shell):** always write `${VAR}` before a colon. zsh reads `$VAR:r`, `$VAR:e`, etc. as modifiers, so `"repo:$REPO:ref:..."` silently becomes `repo:…ef:...`.

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
# Production: real site, port 3000. Staging: scales to zero when idle (on demand).
for ENV_NAME in staging production; do
  az containerapp create -n ca-sblawn-${ENV_NAME} -g $RG --environment $CAE \
    --image $ACR.azurecr.io/sblawn-site:bootstrap \
    --registry-server $ACR.azurecr.io --registry-identity system --system-assigned \
    --target-port 3000 --ingress external \
    --min-replicas 0 --max-replicas 3 --cpu 0.5 --memory 1Gi
done

# Let each app pull from ACR with its managed identity (no passwords)
ACR_ID=$(az acr show -n $ACR --query id -o tsv)
for ENV_NAME in staging production; do
  PRINCIPAL=$(az containerapp show -n ca-sblawn-${ENV_NAME} -g $RG --query identity.principalId -o tsv)
  az role assignment create --assignee $PRINCIPAL --role AcrPull --scope $ACR_ID
done
```

- If the first revision shows a pull error, wait a minute for role propagation and run `az containerapp update` again.
- If the `bootstrap` image from step 2 isn't in ACR, `az containerapp create` falls back to Microsoft's placeholder (`mcr.microsoft.com/k8se/quickstart`, which listens on port **80**). Later `az containerapp update` calls must then pass `--image` explicitly, or they fail with `MANIFEST_UNKNOWN`.
- Production uses `--min-replicas 0` while there's no real traffic. At the custom-domain cutover, set it to `1` so visitors never hit a cold start.

## 4. Azure logins for GitHub Actions (OIDC, no secrets)

GitHub proves who it is with a short-lived token; Azure trusts it only for the exact **subject** listed in a federated credential.

### 4a. Production login (`gh-sblawn-site`)

Used by the image build on `main` and the `production` environment.

```bash
APP_ID=$(az ad app create --display-name gh-sblawn-site --query appId -o tsv)
az ad sp create --id $APP_ID
SP_ID=$(az ad sp show --id $APP_ID --query id -o tsv)

az role assignment create --assignee $SP_ID --role AcrPush --scope $ACR_ID
az role assignment create --assignee $SP_ID --role Contributor \
  --scope $(az group show -n $RG --query id -o tsv)   # tighten to a custom role later

fed() {  # $1 = app id, $2 = name, $3 = subject
  az ad app federated-credential create --id $1 --parameters "{
    \"name\": \"$2\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"$3\",
    \"audiences\": [\"api://AzureADTokenExchange\"]}"
}
fed $APP_ID gh-main     "repo:${REPO}:ref:refs/heads/main"
fed $APP_ID gh-env-prod "repo:${REPO}:environment:production"
```

### 4b. Staging login (`gh-sblawn-site-staging`)

Used only by the `staging` environment. It can push images, update **only** `ca-sblawn-staging`, and attach it to the shared environment, nothing else.

```bash
STG_APP_ID=$(az ad app create --display-name gh-sblawn-site-staging --query appId -o tsv)
az ad sp create --id $STG_APP_ID
STG_SP=$(az ad sp show --id $STG_APP_ID --query id -o tsv)

# Custom role: join the shared environment without being able to change it
cat > cae-joiner.json <<EOF
{
  "Name": "Container Apps Environment Joiner (sblawn)",
  "Description": "Read a Container Apps environment and deploy apps into it. No changes to the environment itself.",
  "Actions": ["Microsoft.App/managedEnvironments/read", "Microsoft.App/managedEnvironments/join/action"],
  "AssignableScopes": ["$(az group show -n $RG --query id -o tsv)"]
}
EOF
az role definition create --role-definition cae-joiner.json   # may take a minute to be assignable

az role assignment create --assignee-object-id $STG_SP --assignee-principal-type ServicePrincipal \
  --role AcrPush --scope $ACR_ID
az role assignment create --assignee-object-id $STG_SP --assignee-principal-type ServicePrincipal \
  --role Contributor --scope $(az containerapp show -n ca-sblawn-staging -g $RG --query id -o tsv)
az role assignment create --assignee-object-id $STG_SP --assignee-principal-type ServicePrincipal \
  --role "Container Apps Environment Joiner (sblawn)" --scope $(az containerapp env show -n $CAE -g $RG --query id -o tsv)

fed $STG_APP_ID gh-env-staging "repo:${REPO}:environment:staging"
```

### Check

```bash
for ID in $APP_ID $STG_APP_ID; do az ad app federated-credential list --id $ID --query "[].{name:name, subject:subject}" -o table; done
echo "AZURE_CLIENT_ID=$APP_ID   STAGING AZURE_CLIENT_ID=$STG_APP_ID"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)"
```

**Troubleshooting `AADSTS700213: No matching federated identity record found`:** the error message prints the exact subject GitHub presented. Compare it with the list above and fix the mismatched credential with `az ad app federated-credential update --id <app id> --federated-credential-id <name> --parameters '<same JSON as above>'`. Typical causes: a mangled subject (zsh modifiers), the plain `owner/repo` form instead of the ID form, or the repo having moved/been renamed.

## 5. GitHub settings (repo: Settings)

Repository variables (Settings → Secrets and variables → Actions → Variables):

| Name | Value |
|---|---|
| `AZURE_CLIENT_ID` | production login's `APP_ID` (4a) |
| `AZURE_TENANT_ID` | from the check above |
| `AZURE_SUBSCRIPTION_ID` | from the check above |
| `ACR_NAME` | `sblawnacr` |
| `ACR_LOGIN_SERVER` | `sblawnacr.azurecr.io` |

Environments (Settings → Environments). Environment variables override repository variables of the same name.

| | staging | production |
|---|---|---|
| `AZURE_CLIENT_ID` | staging login's `STG_APP_ID` (4b) | *(not set: uses the repo value)* |
| `AZURE_RESOURCE_GROUP` | `rg-sblawn-web` | `rg-sblawn-web` |
| `CONTAINERAPP_NAME` | `ca-sblawn-staging` | `ca-sblawn-production` |
| `SITE_URL` | `https://<staging fqdn>` | `https://<production fqdn>`, then `https://www.sblawnsystems.com` after the domain cutover |
| Required reviewers | none | you (deploys wait for approval) |
| Deployment branches | all branches | `main` only |

Get an app's address with `az containerapp show -n <app> -g $RG --query properties.configuration.ingress.fqdn -o tsv`. Always include `https://` in `SITE_URL`: without it the smoke test hits plain http, gets a redirect, and passes without loading the page.

## 6. Day to day

- **Production:** merge a PR to `main` → the run builds the image, then pauses at **Production**. Open the run → **Review deployments** → tick `production` → **Approve and deploy**.
- **Staging:** Actions → **Deploy to staging** → **Run workflow** → choose a branch. The first request after idle takes ~20 s while staging wakes up.
- **Redeploy production without new code:** `gh workflow run ci-cd.yml --ref main` (still needs approval), or **Re-run jobs** on an earlier run to roll back to that run's image.

## Later

- Custom domain and managed TLS on the production Container App, then point DNS at it, and set production `--min-replicas 1`.
- Replace the production login's resource-group Contributor with a custom role limited to updating the two Container Apps.
- Move images to Blob + CDN (`next.config.ts` remotePatterns) when media migrates.
