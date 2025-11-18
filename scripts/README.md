# Scripts

This directory contains utility scripts for managing the monorepo.

## version.js

A Node.js script for managing versions across all packages in the monorepo.

### Usage

**List current versions:**
```bash
npm run version:list
# or
node scripts/version.js --list
```

**Update all packages to a specific version:**
```bash
npm run version:set 0.0.10
# or
node scripts/version.js 0.0.10
```

### Examples

```bash
# Check current versions
$ npm run version:list
Current versions:
  detekt: 0.0.10
  ktlint: 0.0.10
  ktfmt: 0.0.10

# Update to new version
$ npm run version:set 0.1.0
Updating all packages to version 0.1.0...

✓ Updated detekt: 0.0.10 → 0.1.0
✓ Updated ktlint: 0.0.10 → 0.1.0
✓ Updated ktfmt: 0.0.10 → 0.1.0

✓ All packages updated successfully!
```

### Release Workflow

After updating versions with this script:

1. Review changes: `git diff`
2. Commit changes: `git add . && git commit -m "chore: bump version to X.Y.Z"`
3. Push to main: `git push`
4. The individual package workflows (`publish-detekt.yml`, `publish-ktlint.yml`, `publish-ktfmt.yml`) will automatically detect the version changes and trigger releases

Alternatively, you can use the unified release workflow:
- Go to GitHub Actions
- Run the "Release All Extensions" workflow manually
- Provide the version number (must match the versions in package.json files)
