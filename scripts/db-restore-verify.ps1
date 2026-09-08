param([Parameter(Mandatory=$true)][string]$BackupFile,[string]$Container="erp-cliente-postgres",[string]$User="postgres",[string]$VerifyDatabase="buzzbee_restore_verify")
$ErrorActionPreference="Stop"; if(!(Test-Path $BackupFile)){throw "No existe el archivo."}
$exists=docker exec $Container psql -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$VerifyDatabase'"
if($exists.Trim() -eq "1"){throw "La base de verificación ya existe. No se sobrescribirá."}
docker exec $Container createdb -U $User $VerifyDatabase
Get-Content -Encoding Byte $BackupFile | docker exec -i $Container pg_restore -U $User -d $VerifyDatabase --no-owner --no-privileges
docker exec $Container psql -U $User -d $VerifyDatabase -c "SELECT current_database(), now();"
Write-Host "OK: restore verificado en base aislada. No se tocó la base productiva."
