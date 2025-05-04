$ErrorActionPreference = "Stop";
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;
$ProgressPreference = 'SilentlyContinue'; 
$null = New-Item -Type Directory -Force $env:appdata/cockroach;
Invoke-WebRequest -Uri https://binaries.cockroachdb.com/cockroach-v25.1.5.windows-6.2-amd64.zip -OutFile cockroach.zip;
Expand-Archive -Force -Path cockroach.zip;
Copy-Item -Force "cockroach/cockroach-v25.1.5.windows-6.2-amd64/cockroach.exe" -Destination "C:\Program Files\CockroachDB";
$Env:PATH += ";C:\Program Files\CockroachDB"