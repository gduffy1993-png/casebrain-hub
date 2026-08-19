# CaseBrain external review-bundle recipe
#
# Regenerates `casebrain-review-bundle.zip` from clean committed HEAD.
# Does not modify production code. Does not commit the ZIP.
#
# Usage (from worktree root):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/assurance/pack-casebrain-review-bundle.ps1
#
# Rules (stable):
# - Copy criminal/logic libs, upload/extract, UI (cases + Overview/Court/Papers/Client/Chase/File)
# - Master 3000 assurance scripts/tests, 361 registry, Phase 6–9 + known-risk artefacts
# - Security-relevant criminal API routes for tenant-isolation review (no secrets)
# - Exclude node_modules, .next, .git, dist, coverage, bulk, chromium-html, binaries, *.env*
# - Stub lib/eval/casebrain-auditor/script-supabase.ts in the stage only
# - REVIEW-MAP.md at ZIP root with content checkpoint SHA + final branch-tip SHA

$ErrorActionPreference = 'Stop'
$ROOT = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$STAGE = Join-Path $ROOT '_review-bundle-stage'
$OUTZIP = Join-Path $ROOT 'casebrain-review-bundle.zip'

if (Test-Path $STAGE) { Remove-Item $STAGE -Recurse -Force }
if (Test-Path $OUTZIP) { Remove-Item $OUTZIP -Force }
New-Item -ItemType Directory -Force -Path $STAGE | Out-Null

function Copy-Rel($rel) {
  $src = Join-Path $ROOT $rel
  if (-not (Test-Path -LiteralPath $src)) { Write-Output "MISSING $rel"; return }
  $dst = Join-Path $STAGE $rel
  $parent = Split-Path $dst -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  if (Test-Path -LiteralPath $src -PathType Container) {
    robocopy $src $dst /E /NFL /NDL /NJH /NJS /nc /ns /np `
      /XD node_modules .next .git dist coverage bulk chromium-html `
      /XF *.env *.pem *.key *.p12 *.pfx .env* `
      | Out-Null
  } else {
    Copy-Item -LiteralPath $src -Destination $dst -Force
  }
}

# Config / package
@(
  'package.json','package-lock.json','tsconfig.json','next.config.ts','next.config.mjs','next.config.js',
  'vitest.config.ts','vitest.config.mts','playwright.config.ts','tailwind.config.ts','postcss.config.mjs',
  'components.json','README.md','AGENTS.md','.gitignore'
) | ForEach-Object { Copy-Rel $_ }

# Core lib criminal + upload/extract
Copy-Rel 'lib/criminal'
Copy-Rel 'lib/upload'
Copy-Rel 'lib/files'
Copy-Rel 'lib/eval'
Copy-Rel 'lib/types'

# UI consumers
Copy-Rel 'components/criminal'
@(
  'components/cases','components/case','app/(app)','app/(dashboard)','app/cases','app/(criminal)'
) | ForEach-Object { if (Test-Path (Join-Path $ROOT $_)) { Copy-Rel $_ } }

function Copy-Tree($rel) {
  $src = Join-Path $ROOT $rel
  if (-not (Test-Path -LiteralPath $src)) { Write-Output "MISSING $rel"; return }
  $dst = Join-Path $STAGE $rel
  if (Test-Path -LiteralPath $src -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
    Write-Output "OK FILE $rel"
    return
  }
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  robocopy $src $dst /E /NFL /NDL /NJH /NJS /nc /ns /np /XD node_modules .next /XF *.env* *.pem *.key | Out-Null
  Write-Output "OK $rel"
}

@(
  'app/(protected)/cases',
  'app/(protected)/court-today',
  'app/(protected)/documents',
  'app/(protected)/dashboard',
  'app/(protected)/layout.tsx',
  'components/cases',
  'components/layout',
  'components/documents',
  'components/upload',
  'components/providers'
) | ForEach-Object { Copy-Tree $_ }

# Security-relevant criminal API routes (tenant isolation / IDOR review) — never .env values
Copy-Tree 'app/api/criminal/[caseId]/bundle-source'
Copy-Tree 'app/api/criminal/[caseId]/aggressive-defense'
Copy-Tree 'app/api/criminal/[caseId]/phase1-detect'
Copy-Tree 'app/api/criminal/[caseId]/matter'
Copy-Tree 'app/api/criminal/[caseId]/disclosure'
Copy-Tree 'app/api/criminal/[caseId]/evidence-gaps'
Copy-Tree 'app/api/criminal/[caseId]/evidence-analysis'
Copy-Tree 'app/api/criminal/matters'

# Scripts assurance + key tests
Copy-Rel 'scripts/assurance'
Get-ChildItem (Join-Path $ROOT 'scripts') -File -Filter '*.test.ts' | ForEach-Object {
  Copy-Rel ("scripts/" + $_.Name)
}
Get-ChildItem (Join-Path $ROOT 'scripts') -File -Filter 'master3000*.ts' | ForEach-Object {
  Copy-Rel ("scripts/" + $_.Name)
}
Get-ChildItem (Join-Path $ROOT 'scripts') -File -Filter '*source-truth*' | ForEach-Object {
  Copy-Rel ("scripts/" + $_.Name)
}
Get-ChildItem (Join-Path $ROOT 'scripts') -File -Filter '*disclosure-chase*' | ForEach-Object {
  Copy-Rel ("scripts/" + $_.Name)
}

# Artifacts: registry + gold/holdout + phase 6-9 + known-risk
$artBase = 'artifacts/casebrain-qa/assurance/master-auditor-v2'
Copy-Rel "$artBase/auditor-control-registry-v2.json"
@(
  'master-3000-phase4-gold-holdout-design',
  'master-3000-phase5-starter-gold-audit',
  'master-3000-phase6-p1-live-builder-validation',
  'master-3000-phase7-high-risk-coverage-expansion',
  'master-3000-phase8-source-ingest-coverage',
  'master-3000-phase9-representative-150',
  'master-3000-known-risk-closure'
) | ForEach-Object { Copy-Rel "$artBase/$_" }

Copy-Rel 'artifacts/evidence-state-audit-local/cases/cb-fresh-002-jordan-hale'
Copy-Rel 'docs/bundle-fidelity-set/gold/cb-fresh-002-jordan-hale'

# Remove unsafe / heavy after copy
Get-ChildItem $STAGE -Recurse -Force -File | Where-Object {
  $_.Name -match '^\.env' -or $_.Extension -in '.pem','.key','.p12','.pfx' -or $_.Name -match 'service.?role|credentials\.json'
} | ForEach-Object { Remove-Item $_.FullName -Force; Write-Output "REMOVED_UNSAFE $($_.FullName)" }

Get-ChildItem $STAGE -Recurse -File | Where-Object {
  ($_.Name -eq 'PHASE9-REPRESENTATIVE-AUDIT-RESULTS.json') -or
  ($_.Name -eq 'PHASE6-LIVE-BUILDER-AUDIT-RESULTS.json' -and $_.Length -gt 2MB) -or
  ($_.DirectoryName -match 'chromium-html') -or
  ($_.Extension -in '.png','.jpg','.jpeg','.pdf','.mp4','.webm')
} | ForEach-Object {
  Write-Output "EXCLUDED_HEAVY $($_.Name) $([math]::Round($_.Length/1MB,2))MB"
  Remove-Item $_.FullName -Force
}

# Stage-only stub for admin supabase helper
$stubPath = Join-Path $STAGE 'lib\eval\casebrain-auditor\script-supabase.ts'
if (Test-Path $stubPath) {
  @"
/**
 * REVIEW BUNDLE STUB — production file reads SUPABASE_SERVICE_ROLE_KEY from process.env only.
 * No secrets are embedded here. See REVIEW-MAP.md.
 */
export function getAuditorSupabaseAdmin(): never {
  throw new Error("Supabase admin client intentionally stubbed in the external review bundle.");
}
"@ | Set-Content -LiteralPath $stubPath -Encoding UTF8
}

$head = (git -C $ROOT rev-parse HEAD).Trim()
$branch = (git -C $ROOT branch --show-current).Trim()
@"
# CaseBrain external review map

Generated for ChatGPT / external code review. This ZIP is a **source snapshot**, not a runnable production deployment.

## Repository identity (at packaging)

| Item | Value |
|---|---|
| Branch | ``$branch`` |
| Content checkpoint SHA | ``$head`` |
| Final branch-tip SHA | ``$head`` |
| HEAD (packaged commit) | ``$head`` |
| PR | [#66](https://github.com/gduffy1993-png/casebrain-hub/pull/66) |

## Security routes included for tenant-isolation review

- ``app/api/criminal/[caseId]/bundle-source/``
- ``app/api/criminal/[caseId]/aggressive-defense/``
- ``app/api/criminal/[caseId]/phase1-detect/``
- ``app/api/criminal/[caseId]/matter/``
- ``app/api/criminal/[caseId]/disclosure/``
- ``app/api/criminal/[caseId]/evidence-gaps/``
- ``app/api/criminal/[caseId]/evidence-analysis/``
- ``app/api/criminal/matters/``

No ``.env*``, certificates, or service-role **values** are included. Admin supabase helper is stubbed in-bundle.

See prior REVIEW-MAP architecture sections in the programme history for PDF ingest → canonical evidence → solicitor exits.
"@ | Set-Content -LiteralPath (Join-Path $STAGE 'REVIEW-MAP.md') -Encoding UTF8

Push-Location $STAGE
Compress-Archive -Path * -DestinationPath $OUTZIP -CompressionLevel Optimal
Pop-Location

$item = Get-Item $OUTZIP
$files = (Get-ChildItem $STAGE -Recurse -File).Count
Write-Output "ZIP=$($item.FullName)"
Write-Output "SIZE_MB=$([math]::Round($item.Length/1MB,2))"
Write-Output "STAGED_FILES=$files"
Write-Output "HEAD=$head"
Remove-Item $STAGE -Recurse -Force
Write-Output 'STAGE_REMOVED'
