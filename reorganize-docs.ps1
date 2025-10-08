# Documentation Reorganization Script
Write-Host "Starting documentation reorganization..." -ForegroundColor Green

# Function to move file if it exists
function Move-IfExists {
    param($Source, $Destination)
    if (Test-Path $Source) {
        Move-Item $Source $Destination -Force
        Write-Host "✓ Moved: $Source -> $Destination" -ForegroundColor Green
    } else {
        Write-Host "⊘ Not found: $Source" -ForegroundColor Yellow
    }
}

# Move from .github/ to docs/contributing/ci-cd/
Write-Host "`n=== Moving .github/ files ===" -ForegroundColor Cyan
Move-IfExists ".github/CI_WORKFLOW_EXPLAINED.md" "docs/contributing/ci-cd/workflow-explained.md"
Move-IfExists ".github/CI_QUICK_REFERENCE.md" "docs/contributing/ci-cd/quick-reference.md"
Move-IfExists ".github/GITHUB_ACTIONS_GLOSSARY.md" "docs/contributing/ci-cd/github-actions-glossary.md"

# Move from .github/ to docs/contributing/
Move-IfExists ".github/QUICK_REFERENCE.md" "docs/contributing/quick-reference.md"

# Move from root to docs/contributing/ci-cd/
Write-Host "`n=== Moving root CI/CD files ===" -ForegroundColor Cyan
Move-IfExists "CI_CD_SETUP_GUIDE.md" "docs/contributing/ci-cd/setup-guide.md"
Move-IfExists "CI_CD_IMPLEMENTATION_SUMMARY.md" "docs/contributing/ci-cd/implementation.md"
Move-IfExists "README_CI_CD.md" "docs/contributing/ci-cd/overview.md"

# Move from root to docs/archive/2024-restructuring/
Write-Host "`n=== Moving restructuring docs to archive ===" -ForegroundColor Cyan
Move-IfExists "CURRENT_STRUCTURE.md" "docs/archive/2024-restructuring/current-structure.md"
Move-IfExists "RESTRUCTURING_PLAN.md" "docs/archive/2024-restructuring/plan.md"
Move-IfExists "RESTRUCTURING_SUMMARY.md" "docs/archive/2024-restructuring/summary.md"

# Move from docs/ to docs/architecture/
Write-Host "`n=== Moving architecture docs ===" -ForegroundColor Cyan
Move-IfExists "docs/ARCHITECTURE.md" "docs/architecture/overview.md"
Move-IfExists "docs/GLOSSARY.md" "docs/architecture/glossary.md"
Move-IfExists "docs/STRUCTURE.md" "docs/architecture/domain-model.md"
Move-IfExists "docs/FILES.md" "docs/architecture/file-structure.md"
Move-IfExists "docs/LAYER_STRATEGIES.md" "docs/architecture/layer-strategies.md"
Move-IfExists "docs/IMPLEMENTATION_SUMMARY.md" "docs/architecture/implementation-summary.md"

# Move from docs/ to docs/api/
Write-Host "`n=== Moving API docs ===" -ForegroundColor Cyan
Move-IfExists "docs/NODES_STRUCTURE.md" "docs/api/nodes.md"

# Move from docs/ to docs/guides/
Write-Host "`n=== Moving guide docs ===" -ForegroundColor Cyan
Move-IfExists "docs/COLOR_REFERENCE.md" "docs/guides/colors.md"
Move-IfExists "docs/STITCH_TYPE_COLORS.md" "docs/guides/stitch-type-colors.md"
Move-IfExists "docs/STITCH_TYPE_SPACING.md" "docs/guides/stitch-type-spacing.md"

# Move bugfix docs to archive
Write-Host "`n=== Moving bugfix docs to archive ===" -ForegroundColor Cyan
Get-ChildItem "docs/BUGFIX_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/bugfixes/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/*_FIX*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/bugfixes/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

# Move debug docs to archive
Write-Host "`n=== Moving debug docs to archive ===" -ForegroundColor Cyan
Get-ChildItem "docs/DEBUG_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/MAGIC_RING_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/TILT_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/LAYER_VISIBILITY_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/QUATERNION_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/*_LOGGING.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/LAYER_LEVEL_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/LAYER_SPACING_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/SPACING_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -Force
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Get-ChildItem "docs/DYNAMIC_*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName "docs/archive/debug-guides/$($_.Name)" -ForegroundColor Green
    Write-Host "✓ Moved: $($_.Name)" -ForegroundColor Green
}

Write-Host "`n✅ Documentation reorganization complete!" -ForegroundColor Green

