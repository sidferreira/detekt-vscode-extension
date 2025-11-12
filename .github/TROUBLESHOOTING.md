# GitHub Actions Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Tests Fail Due to Missing Detekt

**Symptom:**
```
Error: spawn ENOENT
or
detekt command not found
```

**Solution:**
- Workflow auto-installs detekt CLI v1.23.6
- If Java isn't available, the script will fail
- GitHub Actions Ubuntu images have Java pre-installed

### Issue 2: Test Reporter Can't Find JUnit XML

**Symptom:**
```
Error: Path does not exist: test-results/junit.xml
```

**Solution:**
- Ensure `jest-junit` is installed: `npm install jest-junit`
- Verify `jest.config.js` has proper configuration:
  ```javascript
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
      },
    ],
  ]
  ```

### Issue 3: Coverage Upload Fails

**Symptom:**
```
Error uploading coverage to Codecov
```

**Solution:**
- This is non-fatal (fail_ci_if_error: false)
- Set up Codecov at: https://codecov.io
- Link your GitHub repository
- Coverage will auto-upload on next run

### Issue 4: TypeScript ESLint Warnings

**Symptom:**
```
WARNING: You are currently running a version of TypeScript which is not officially supported
```

**Solution:**
- This is just a warning, not an error
- Ignore it - extensions can use newer TypeScript than @typescript-eslint officially supports
- The linter still works fine

### Issue 5: Jest Tests Timeout

**Symptom:**
```
Jest timeout exceeded - 30000ms
```

**Solution:**
- Detekt subprocess execution can be slow
- Timeout is set to 30 seconds (see jest.config.js)
- If tests consistently timeout, increase in jest.config.js:
  ```javascript
  testTimeout: 45000  // 45 seconds
  ```

### Issue 6: Node Version Compatibility

**Symptom:**
```
Error: package.json specifies Node version incompatibility
```

**Solution:**
- Tests run on Node 18.x and 20.x
- Verify package.json doesn't specify incompatible constraints
- Check `.npmrc` or `engines` field in package.json

## Debugging Workflow Runs

### View Detailed Logs

1. Go to: https://github.com/sidferreira/detekt-vscode-extension/actions
2. Click on the failed workflow run
3. Click on the job that failed
4. Expand each step to see full output
5. Look for:
   - `Install dependencies` - npm errors?
   - `Install detekt` - curl/java errors?
   - `Run linter` - ESLint errors?
   - `Run tests` - Jest errors?

### Common Error Locations

| Step | Common Issues |
|------|-------------|
| Install dependencies | npm/yarn version conflicts, lockfile issues |
| Install detekt | Network issues, URL outdated, Java missing |
| Run linter | TypeScript/ESLint config errors |
| Run tests | Test failures, timeout, missing mocks |
| Upload test results | junit.xml file not created |
| Upload coverage | Codecov token needed for private repos |

## Local Development & Debugging

### Reproduce CI Environment Locally

```bash
# Install dependencies exactly like CI
npm ci

# Run linter
npm run lint

# Run tests with coverage (like CI)
npm run test -- --coverage

# Check generated files
ls -la test-results/
ls -la coverage/
```

### Test jest-junit Configuration

```bash
# Run tests with verbose output
npm run test -- --verbose

# Check junit.xml was created
cat test-results/junit.xml
```

### Test Detekt Installation

```bash
# Manually install detekt like the workflow does
curl -sSLO https://github.com/detekt/detekt/releases/download/v1.23.6/detekt-cli-1.23.6-all.jar
mkdir -p ~/.local/bin
cat > ~/.local/bin/detekt << 'EOF'
#!/bin/bash
java -jar ~/.detekt/detekt-cli-1.23.6-all.jar "$@"
EOF
chmod +x ~/.local/bin/detekt
mkdir -p ~/.detekt
mv detekt-cli-1.23.6-all.jar ~/.detekt/

# Test it works
detekt --help
```

## Performance Optimization

### Current Timings
- Install dependencies: ~20s
- Install detekt: ~30s
- Lint: ~5s
- Tests: ~10s per Node version
- **Total**: ~65s per workflow run

### Ways to Improve

1. **Cache detekt JAR:**
   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.detekt
       key: detekt-1.23.6
   ```

2. **Skip coverage uploads on non-PR:**
   ```yaml
   - name: Upload coverage
     if: github.event_name == 'pull_request'
   ```

3. **Run linter only once:**
   ```yaml
   lint:
     runs-on: ubuntu-latest
     steps:
       # ... lint steps
   test:
     needs: lint  # Wait for lint to pass
     runs-on: ubuntu-latest
     # ... test steps
   ```

## Workflow File Validation

Check YAML syntax locally:

```bash
# Install yamllint
npm install -g yamllint

# Validate workflow
yamllint .github/workflows/test.yml
```

## GitHub Actions Specific

### Environment Variables

Available during workflow:
```
GITHUB_WORKSPACE         # /home/runner/work/detekt-vscode-extension/...
GITHUB_ACTION            # The name of the action
GITHUB_ACTIONS           # Always 'true'
GITHUB_EVENT_NAME        # 'push' or 'pull_request'
GITHUB_ACTOR             # Username who triggered action
GITHUB_REPOSITORY        # owner/repo
```

### Secrets Access

No secrets needed for this workflow! But if you add features that need them:

```bash
# In GitHub:
Settings → Secrets and variables → Actions → New repository secret

# In workflow:
env:
  MY_SECRET: ${{ secrets.MY_SECRET }}
```

## More Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [jest-junit Reporter](https://github.com/jest-community/jest-junit)
- [Codecov Setup](https://docs.codecov.com/docs/github-actions)
