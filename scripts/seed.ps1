param(
    [switch]$Reset
)

$ErrorActionPreference = "Stop"
$compose = "Docker-compose.yml"

$argsSeed = @(
    "compose", "-f", $compose, "exec", "-T", "inova-api",
    "java", "-jar", "/app/app.jar",
    "--spring.main.web-application-type=none",
    "--app.seed.enabled=true"
)

if ($Reset) {
    $argsSeed += "--app.seed.reset=true"
}

& docker @argsSeed
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
