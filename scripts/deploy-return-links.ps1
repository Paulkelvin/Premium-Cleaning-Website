# Deploy ONLY the Edge Functions needed for email return links + quote reminders.
# Requires: npx supabase@latest login (or $env:SUPABASE_ACCESS_TOKEN).
# After this, run supabase/migrations/20261014_quote_return_links.sql in the SQL Editor.

$ErrorActionPreference = "Stop"
$ProjectRef = "hbacogyhftngwoxenttv"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$functions = @(
  "notify-lead",
  "resume-quote",
  "quote-reminders"
)

foreach ($name in $functions) {
  Write-Host "Deploying $name ..."
  npx --yes supabase@latest functions deploy $name --project-ref $ProjectRef --no-verify-jwt
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Done. Next: run supabase/migrations/20261014_quote_return_links.sql in the Supabase SQL Editor." -ForegroundColor Green
