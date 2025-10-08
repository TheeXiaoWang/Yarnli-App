#!/bin/bash

# CI/CD Setup Script for Yarnli-CAD
# This script installs all dependencies and verifies the setup

set -e  # Exit on error

echo "🚀 Setting up CI/CD infrastructure for Yarnli-CAD..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher is required${NC}"
    echo "   Current version: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
echo ""

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npm run e2e:install
echo -e "${GREEN}✅ Playwright browsers installed${NC}"
echo ""

# Step 4: Run type checking
echo "🔍 Running TypeScript type check..."
if npm run typecheck; then
    echo -e "${GREEN}✅ Type check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Type check found issues (this is normal for a new setup)${NC}"
fi
echo ""

# Step 5: Run linting
echo "🔍 Running ESLint..."
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting found issues${NC}"
    echo "   Run 'npm run lint:fix' to auto-fix some issues"
fi
echo ""

# Step 6: Check formatting
echo "🔍 Checking code formatting..."
if npm run format:check; then
    echo -e "${GREEN}✅ Code is properly formatted${NC}"
else
    echo -e "${YELLOW}⚠️  Code needs formatting${NC}"
    echo "   Run 'npm run format' to auto-format"
fi
echo ""

# Step 7: Run tests
echo "🧪 Running tests..."
if npm run test; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed (this is normal for a new setup)${NC}"
fi
echo ""

# Step 8: Try building
echo "🏗️  Building application..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 CI/CD Setup Complete!${NC}"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Review the setup guide:"
echo "   cat CI_CD_SETUP_GUIDE.md"
echo ""
echo "2. Run all checks before committing:"
echo "   npm run ci"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "4. Run tests in watch mode:"
echo "   npm run test:watch"
echo ""
echo "5. Open test UI:"
echo "   npm run test:ui"
echo ""
echo "6. Run E2E tests:"
echo "   npm run e2e"
echo ""
echo "7. Set up GitHub secrets for deployment:"
echo "   - CODECOV_TOKEN (optional)"
echo "   - VERCEL_TOKEN"
echo "   - VERCEL_ORG_ID"
echo "   - VERCEL_PROJECT_ID"
echo ""
echo "📖 Documentation:"
echo "   - CI_CD_SETUP_GUIDE.md - Complete setup guide"
echo "   - CI_CD_IMPLEMENTATION_SUMMARY.md - What was implemented"
echo "   - .github/QUICK_REFERENCE.md - Quick command reference"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""

