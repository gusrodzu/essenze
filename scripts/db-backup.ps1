param([string]$Container="erp-cliente-postgres",[string]$Database="postgres",[string]$User="postgres",[string]$OutputDir=".\\backups")
$ErrorActionPreference="Stop"; New-Item -ItemType Directory -Force -Path $OutputDir|Out-Null
$stamp=Get-Date -Format "yyyyMMdd-HHmmss"; $file=Join-Path $OutputDir "buzzbee-$stamp.dump"
docker exec $Container pg_dump -U $User -d $Database -Fc | Set-Content -Encoding Byte $file
if(!(Test-Path $file) -or (Get-Item $file).Length -lt 1024){throw "El respaldo no parece válido."}
Write-Host "OK: respaldo creado sin modificar la base de datos: $file"
