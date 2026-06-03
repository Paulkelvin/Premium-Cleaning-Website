# Deploy notification Edge Functions to Supabase project hbacogyhftngwoxenttv.
# Requires: supabase login OR $env:SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens

$ErrorActionPreference = "Stop"
$ProjectRef = "hbacogyhftngwoxenttv"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "No SUPABASE_ACCESS_TOKEN set. Run: npx supabase@latest login" -ForegroundColor Yellow
}

$functions = @(
  "notify-lead",
  "square-webhook",
  "confirm-square-payment"
)

foreach ($name in $functions) {
  Write-Host "Deploying $name ..."
  npx --yes supabase@latest functions deploy $name --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Done. Next: run supabase/migrations/20250603_notification_triggers.sql and follow NOTIFICATIONS_SETUP.md." -ForegroundColor Green
