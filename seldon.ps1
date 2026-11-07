# Runs seldon.mjs with your Seldon key from user variables, only inside this process (never printed).
$env:SELDON_API_KEY = [Environment]::GetEnvironmentVariable("SELDON_API_KEY", "User")
Set-Location $PSScriptRoot
node seldon.mjs @args
