# Starts the dev server with the Claude key from your user variables (set by ../setup-claude-key.ps1), only for this process.
$env:UNSLOP_ANTHROPIC_KEY = [Environment]::GetEnvironmentVariable("UNSLOP_ANTHROPIC_KEY", "User")
Set-Location $PSScriptRoot
npx next dev --port 3090
