# GitHub Actions CI/CD Setup

This repository includes a comprehensive GitHub Actions workflow for continuous testing and reporting.

## Workflow Features

### Automated Testing
- **Runs on**: Every push to `main` and all pull requests
- **Environment**: Ubuntu latest (headless, headless-friendly)
- **Node versions**: Tests run on Node 18.x and 20.x (matrix strategy)

### Test Execution
```bash
npm run test -- --coverage --testResultsProcessor=jest-junit
```

**What happens:**
1. ✅ Installs dependencies
2. ✅ Installs detekt CLI (v1.23.6)
3. ✅ Runs ESLint linter
4. ✅ Runs Jest tests with coverage
5. ✅ Generates JUnit XML report
6. ✅ Uploads coverage to Codecov
7. ✅ Comments coverage on PRs

### Test Results Reporting

#### 1. **JUnit Test Reporter** (dorny/test-reporter@v1)
- Parses jest-junit XML output
- Shows test results in GitHub UI
- Displays per-test timings
- Can link to test files

#### 2. **Codecov Integration**
- Uploads coverage reports
- Tracks coverage trends over time
- Set CI status checks based on coverage
- Public coverage badges

#### 3. **PR Coverage Comments** (romeovs/lcov-reporter-action@v0.3.1)
- Automatically comments on PRs
- Shows coverage changes
- Highlights uncovered lines
- Only runs on pull requests

## Local Development

### Run Tests Locally
```bash
npm run test
```

### Run Tests with Coverage
```bash
npm run test -- --coverage
```

### View Coverage Report
```bash
open coverage/lcov-report/index.html
```

## Detekt in CI

The workflow automatically:
1. Downloads detekt CLI JAR (v1.23.6)
2. Creates wrapper script in `~/.local/bin`
3. Adds to PATH so extension tests can find it

If detekt is unavailable, tests gracefully skip (they're designed to handle this).

## GitHub Actions Secrets

No secrets required! The workflow uses:
- `${{ secrets.GITHUB_TOKEN }}` - Auto-provided by GitHub Actions for PR commenting

## Generated Artifacts

### Local
- `test-results/junit.xml` - JUnit format test results
- `coverage/lcov.info` - LCOV coverage format
- `coverage/lcov-report/` - HTML coverage report

These are in `.gitignore` and won't be committed.

### GitHub Actions
- Test results visible in PR checks
- Coverage uploaded to Codecov
- PR comments with coverage delta

## Customization

### Change Node Versions
Edit `.github/workflows/test.yml`:
```yaml
strategy:
  matrix:
    node-version: [16.x, 18.x, 20.x, 21.x]
```

### Change Detekt Version
Edit `.github/workflows/test.yml`:
```bash
curl -sSLO https://github.com/detekt/detekt/releases/download/v1.24.0/detekt-cli-1.24.0-all.jar
```

### Add Build Matrix for Multiple Detekt Versions
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
    detekt-version: [1.23.6, 1.24.0]
```

## Status Badges

Add to your README:

```markdown
![Tests](https://github.com/sidferreira/detekt-vscode-extension/actions/workflows/test.yml/badge.svg)
[![codecov](https://codecov.io/gh/sidferreira/detekt-vscode-extension/branch/main/graph/badge.svg)](https://codecov.io/gh/sidferreira/detekt-vscode-extension)
```

## Dependencies Added

```json
{
  "jest-junit": "^16.0.0"  // For JUnit XML reporting
}
```

## Files Modified

- `.github/workflows/test.yml` - GitHub Actions workflow (new)
- `jest.config.js` - Added jest-junit reporter configuration
- `package.json` - Added jest-junit dependency
- `.gitignore` - Added test-results/ directory

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Testing Framework](https://jestjs.io/)
- [JUnit Reporter for Jest](https://github.com/jest-community/jest-junit)
- [Codecov Integration](https://about.codecov.io/product/github-ci/)
