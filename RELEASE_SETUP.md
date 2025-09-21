# 🚀 Public Release Setup

This document outlines the steps needed to publish CASOON Atlas as a public repository and npm packages.

## ✅ Completed Setup

### Repository Configuration
- ✅ All package.json files updated with correct repository URLs (`https://github.com/casoon/atlas`)
- ✅ Author information set to **Jörn Seidel** (joern.seidel@casoon.de)
- ✅ MIT License configured with proper copyright
- ✅ README.md updated with badges, author section, and CASOON branding
- ✅ Funding information points to https://www.casoon.de

### NPM Publishing Setup
- ✅ All packages configured for public publishing (`publishConfig.access: "public"`)
- ✅ Proper package descriptions and keywords added
- ✅ `.npmignore` created to control published content
- ✅ Changesets configured for coordinated releases

### CI/CD Setup
- ✅ GitHub Actions workflows created:
  - `ci.yml` - Build and type checking on PRs
  - `release.yml` - Automated npm publishing via changesets

## 🔄 Next Steps

### 1. Create GitHub Repository
```bash
# Push to the public repository
git remote add origin https://github.com/casoon/atlas.git
git branch -M master
git push -u origin master
```

### 2. Configure GitHub Repository Settings
- [ ] Set repository description: "CASOON Atlas - A comprehensive, modern UI effects library built for Tailwind v4"
- [ ] Add topics: `tailwind`, `css`, `javascript`, `effects`, `ui`, `components`, `ssr`, `typescript`
- [ ] Enable Issues and Discussions
- [ ] Add repository rules for master branch protection

### 3. Setup NPM Publishing
```bash
# Login to npm (one-time setup)
npm login

# Or set NPM_TOKEN in GitHub Secrets for automated publishing
# Get token from: https://www.npmjs.com/settings/tokens
```

### 4. Configure GitHub Secrets (for automated releases)
Add these secrets in GitHub repository settings:
- `NPM_TOKEN` - Your npm authentication token for publishing packages
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### 5. First Release
```bash
# Create your first changeset
pnpm changeset

# This will prompt you to:
# - Select which packages to bump
# - Choose version bump type (patch/minor/major)  
# - Write a changelog description

# Apply version bumps and update changelog
pnpm version

# Build and publish (or let GitHub Actions do this)
pnpm release
```

## 📦 Package Information

### Published Packages
- `@casoon/atlas-styles@0.0.1` - CSS design system with glass effects
- `@casoon/atlas-effects@0.0.1` - Interactive JavaScript effects  
- `@casoon/atlas-components@0.0.1` - Headless UI components
- `@casoon/atlas@0.0.1` - Meta-package with all modules

### Installation
```bash
# Individual packages
npm install @casoon/atlas-styles @casoon/atlas-effects @casoon/atlas-components
# OR install all at once:
npm install @casoon/atlas
npm install @casoon/all
```

## 🌐 Links
- **Repository**: https://github.com/casoon/atlas
- **NPM Organization**: https://www.npmjs.com/org/casoon
- **Author Website**: https://www.casoon.de
- **Contact**: joern.seidel@casoon.de

## 📋 Post-Release Tasks
- [ ] Update npm package badges once published
- [ ] Create GitHub releases with changelogs
- [ ] Add demo deployment (GitHub Pages or Vercel)
- [ ] Update CASOON website with project information
- [ ] Share on social media and development communities