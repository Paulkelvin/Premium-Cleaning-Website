# Deploy offline-invoice Edge Functions to Supabase project hbacogyhftngwoxenttv.
# Requires: supabase login OR $env:SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens

$ErrorActionPreference = "Stop"
$ProjectRef = "hbacogyhftngwoxenttv"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "No SUPABASE_ACCESS_TOKEN set. Run: npx supabase@latest login" -ForegroundColor Yellow
}

$functions = @(
  "admin-create-invoice",
  "admin-invoice-checkout",
  "send-payment-invoice"
)

foreach ($name in $functions) {
  Write-Host "Deploying $name ..."
  npx --yes supabase@latest functions deploy $name --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Done. Verify in Dashboard -> Edge Functions." -ForegroundColor Green
