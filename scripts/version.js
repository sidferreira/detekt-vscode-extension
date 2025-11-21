#!/usr/bin/env node

/**
 * Version management script for extensions
 * Updates version in root and all extension package.json files
 */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npm run version:set <VERSION>

Update version in root and all extension package.json files.

Arguments:
  VERSION    The new version to set (e.g., 0.0.10)

Options:
  --help, -h Show this help message
  --list, -l List current versions

Examples:
  npm run version:set 0.0.10
  npm run version:list
`);
    return;
  }
  
  if (args[0] === '--list' || args[0] === '-l') {
    const rootPkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    console.log(`\nCurrent versions:`);
    console.log(`  root: ${rootPkg.version}`);
    ['detekt', 'ktlint'].forEach(ext => {
      const pkg = JSON.parse(fs.readFileSync(`./extensions/${ext}/package.json`, 'utf-8'));
      console.log(`  ${ext}: ${pkg.version}`);
    });
    console.log('');
    return;
  }
  
  const newVersion = args[0];
  
  // Validate version format (simple check)
  if (!/^\d+\.\d+\.\d+/.test(newVersion)) {
    console.error('Error: Invalid version format. Expected format: X.Y.Z');
    process.exit(1);
  }
  
  console.log(`Updating all versions to ${newVersion}...\n`);
  
  // Update root
  const rootPkgPath = './package.json';
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  const oldVersion = rootPkg.version;
  rootPkg.version = newVersion;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
  console.log(`✓ Updated root: ${oldVersion} → ${newVersion}`);
  
  // Update extension package.json files
  ['detekt', 'ktlint'].forEach(ext => {
    const pkgPath = `./extensions/${ext}/package.json`;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✓ Updated ${ext}: ${oldVersion} → ${newVersion}`);
  });
  
  console.log('\n✓ All versions updated successfully!');
  console.log('\nNext steps:');
  console.log('  git add .');
  console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
  console.log('  git push');
}

main();

