# One-time: update Supabase Auth login for the primary super admin.
# Never commit passwords. Set env vars locally, then run:
#   $env:SUPABASE_SERVICE_ROLE_KEY = "<from Dashboard → Settings → API → service_role>"
#   $env:SUPABASE_ADMIN_PASSWORD = "<new password>"
#   .\scripts\set-ryann-admin-auth.ps1

param(
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$UserId = $env:SUPABASE_ADMIN_USER_ID,
  [string]$Email = $env:SUPABASE_ADMIN_EMAIL,
  [Parameter(Mandatory = $false)]
  [string]$Password = $env:SUPABASE_ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"

if (-not $ServiceRoleKey) {
  Write-Host "Set SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role)." -ForegroundColor Red
  exit 1
}
if (-not $Password) {
  Write-Host "Set SUPABASE_ADMIN_PASSWORD to the new password (do not store in this repo)." -ForegroundColor Red
  exit 1
}
if (-not $UserId) {
  Write-Host "Set SUPABASE_ADMIN_USER_ID to the Supabase Auth user UUID." -ForegroundColor Red
  exit 1
}
if (-not $Email) {
  $Email = "ryann@rslegalcollective.com"
}

$uri = "https://hbacogyhftngwoxenttv.supabase.co/auth/v1/admin/users/$UserId"
$body = @{ email = $Email; password = $Password; email_confirm = $true } | ConvertTo-Json
$headers = @{
  Authorization = "Bearer $ServiceRoleKey"
  apikey        = $ServiceRoleKey
  "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri $uri -Method PUT -Headers $headers -Body $body
Write-Host "Updated auth user to $Email" -ForegroundColor Green
