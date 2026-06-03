# One-time: update Supabase Auth login for the primary super admin.
# Get the service_role key from: Supabase Dashboard → Project Settings → API → service_role (secret)

param(
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$UserId = "eb46d910-8f22-403e-b4be-8a338a896745",
  [string]$Email = "ryann@rslegalcollective.com",
  [string]$Password = "REDACTED"
)

$ErrorActionPreference = "Stop"
if (-not $ServiceRoleKey) {
  Write-Host "Set SUPABASE_SERVICE_ROLE_KEY or pass -ServiceRoleKey" -ForegroundColor Red
  exit 1
}

$uri = "https://hbacogyhftngwoxenttv.supabase.co/auth/v1/admin/users/$UserId"
$body = @{ email = $Email; password = $Password; email_confirm = $true } | ConvertTo-Json
$headers = @{
  Authorization = "Bearer $ServiceRoleKey"
  apikey = $ServiceRoleKey
  "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri $uri -Method PUT -Headers $headers -Body $body
Write-Host "Updated auth user to $Email" -ForegroundColor Green
