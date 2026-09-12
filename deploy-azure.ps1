<#
.SYNOPSIS
    Builds the retro-explorer Docker image in Azure Container Registry and deploys it to the
    Azure Container App.

.DESCRIPTION
    Runs `az acr build` (cloud build, no local Docker daemon required) against the repo root
    Dockerfile, tags the result with both a timestamp-based version and `latest`, then updates
    the Container App to run the new image.

.PARAMETER Tag
    Image tag to build/deploy. Defaults to a timestamp (e.g. 20260912-090300).

.EXAMPLE
    ./deploy-azure.ps1
.EXAMPLE
    ./deploy-azure.ps1 -Tag v6
#>
[CmdletBinding()]
param(
    [string]$Tag = (Get-Date -Format 'yyyyMMdd-HHmmss'),

    [string]$SubscriptionId = '5699a20e-062c-49b9-84a9-368bbfe44976',
    [string]$ResourceGroup = 'rg-retro-explorer',
    [string]$RegistryName = 'retroexploreracr',
    [string]$ContainerAppName = 'retro-explorer'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $repoRoot
try {
    $image = "$RegistryName.azurecr.io/retro-explorer"

    Write-Host "==> Setting subscription $SubscriptionId" -ForegroundColor Cyan
    az account set --subscription $SubscriptionId

    Write-Host "==> Building image ${image}:$Tag in ACR (this can take a few minutes)" -ForegroundColor Cyan
    az acr build `
        --registry $RegistryName `
        --image "retro-explorer:$Tag" `
        --image "retro-explorer:latest" `
        --file Dockerfile `
        .
    if ($LASTEXITCODE -ne 0) { throw "az acr build failed with exit code $LASTEXITCODE" }

    Write-Host "==> Updating container app $ContainerAppName to ${image}:$Tag" -ForegroundColor Cyan
    az containerapp update `
        --name $ContainerAppName `
        --resource-group $ResourceGroup `
        --image "${image}:$Tag"
    if ($LASTEXITCODE -ne 0) { throw "az containerapp update failed with exit code $LASTEXITCODE" }

    $fqdn = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv
    Write-Host "==> Deployed ${image}:$Tag to https://$fqdn" -ForegroundColor Green
}
finally {
    Pop-Location
}
