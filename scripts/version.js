#!/usr/bin/env node

/**
 * Version management script for the monorepo
 * Updates version in all package.json files
 */

const fs = require('fs');
const path = require('path');

const PACKAGES = ['detekt', 'ktlint', 'ktfmt'];

function updateVersion(packageName, version) {
  const packagePath = path.join(__dirname, '..', 'packages', packageName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const oldVersion = packageJson.version;
  packageJson.version = version;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Updated ${packageName}: ${oldVersion} → ${version}`);
  
  return oldVersion;
}

function getCurrentVersion(packageName) {
  const packagePath = path.join(__dirname, '..', 'packages', packageName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node scripts/version.js [VERSION]

Update version for all packages in the monorepo.

Arguments:
  VERSION    The new version to set (e.g., 0.0.10)

Options:
  --help, -h Show this help message
  --list, -l List current versions

Examples:
  node scripts/version.js 0.0.10
  node scripts/version.js --list
`);
    return;
  }
  
  if (args[0] === '--list' || args[0] === '-l') {
    console.log('Current versions:');
    PACKAGES.forEach(pkg => {
      const version = getCurrentVersion(pkg);
      console.log(`  ${pkg}: ${version}`);
    });
    return;
  }
  
  const newVersion = args[0];
  
  // Validate version format (simple check)
  if (!/^\d+\.\d+\.\d+/.test(newVersion)) {
    console.error('Error: Invalid version format. Expected format: X.Y.Z');
    process.exit(1);
  }
  
  console.log(`Updating all packages to version ${newVersion}...\n`);
  
  PACKAGES.forEach(pkg => {
    updateVersion(pkg, newVersion);
  });
  
  console.log('\n✓ All packages updated successfully!');
  console.log('\nNext steps:');
  console.log('  1. Review the changes: git diff');
  console.log('  2. Commit: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
  console.log('  3. Push to trigger releases: git push');
}

main();
