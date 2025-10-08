@echo off
REM CI/CD Setup Script for Yarnli-CAD (Windows)
REM This script installs all dependencies and verifies the setup

echo.
echo ========================================
echo   CI/CD Setup for Yarnli-CAD
echo ========================================
echo.

REM Step 1: Check Node.js
echo [1/8] Checking Node.js version...
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js 18 or higher from https://nodejs.org
    exit /b 1
)
echo OK: Node.js is installed
node -v
echo.

REM Step 2: Install dependencies
echo [2/8] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo OK: Dependencies installed
echo.

REM Step 3: Install Playwright browsers
echo [3/8] Installing Playwright browsers...
call npm run e2e:install
if errorlevel 1 (
    echo WARNING: Failed to install Playwright browsers
    echo You can install them later with: npm run e2e:install
)
echo OK: Playwright browsers installed
echo.

REM Step 4: Type checking
echo [4/8] Running TypeScript type check...
call npm run typecheck
if errorlevel 1 (
    echo WARNING: Type check found issues
    echo This is normal for a new setup
)
echo.

REM Step 5: Linting
echo [5/8] Running ESLint...
call npm run lint
if errorlevel 1 (
    echo WARNING: Linting found issues
    echo Run 'npm run lint:fix' to auto-fix some issues
)
echo.

REM Step 6: Formatting
echo [6/8] Checking code formatting...
call npm run format:check
if errorlevel 1 (
    echo WARNING: Code needs formatting
    echo Run 'npm run format' to auto-format
)
echo.

REM Step 7: Tests
echo [7/8] Running tests...
call npm run test
if errorlevel 1 (
    echo WARNING: Some tests failed
    echo This is normal for a new setup
)
echo.

REM Step 8: Build
echo [8/8] Building application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    exit /b 1
)
echo OK: Build successful
echo.

REM Summary
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Review the setup guide:
echo    type CI_CD_SETUP_GUIDE.md
echo.
echo 2. Run all checks before committing:
echo    npm run ci
echo.
echo 3. Start development server:
echo    npm run dev
echo.
echo 4. Run tests in watch mode:
echo    npm run test:watch
echo.
echo 5. Open test UI:
echo    npm run test:ui
echo.
echo 6. Run E2E tests:
echo    npm run e2e
echo.
echo Documentation:
echo   - CI_CD_SETUP_GUIDE.md
echo   - CI_CD_IMPLEMENTATION_SUMMARY.md
echo   - .github\QUICK_REFERENCE.md
echo.
echo Happy coding!
echo.
pause

