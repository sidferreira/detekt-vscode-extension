# Contributing to Detekt VSCode Extension

Thank you for your interest in contributing to the Detekt VSCode Extension! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Additional Resources](#additional-resources)

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Visual Studio Code
- detekt CLI (for testing)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sidferreira/detekt-vscode-extension.git
   cd detekt-vscode-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile and test**
   ```bash
   npm run compile
   npm test
   ```

For detailed development information, architecture, and debugging tips, see the [Development Guide](docs/DEVELOPMENT.md).

## Development Workflow

### Quick Start

```bash
# Compile TypeScript
npm run compile

# Watch mode for development  
npm run watch

# Run the extension
# Press F5 in VSCode to launch Extension Development Host
```

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in the `src/` directory

3. **Test your changes**
   ```bash
   npm run compile
   npm test
   npm run lint
   ```

4. **Test manually** - Press `F5` to launch Extension Development Host

For detailed architecture and debugging information, see [Development Guide](docs/DEVELOPMENT.md).

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Integration tests are located in `test/detekt.integration.test.ts`
- Test fixtures are in `test/fixtures/`
- Tests mock the VSCode API using Jest
- Tests require compilation before running

### Test Requirements

- All tests must pass before submitting a PR
- New features should include tests
- Bug fixes should include regression tests
- Maintain or improve code coverage

## Submitting Changes

### Pull Request Process

1. **Ensure all tests pass**
   ```bash
   npm test
   npm run lint
   ```

2. **Update documentation**
   - Update README.md if user-facing changes
   - Update CHANGELOG.md with your changes
   - Add JSDoc comments for new functions

3. **Commit your changes**
   - Use clear, descriptive commit messages
   - Follow conventional commit format when possible
   - Example: `feat: add support for custom config path`

4. **Push to your fork and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Fill out the PR template**
   - Describe what changes you made
   - Link any related issues
   - Include screenshots for UI changes

### PR Guidelines

- Keep PRs focused on a single feature or fix
- Ensure CI passes (build, lint, test)
- Respond to review feedback promptly
- Squash commits before merging if requested

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Add type annotations for function parameters and returns
- Avoid `any` types when possible
- Use meaningful variable and function names

### Formatting

The project uses ESLint for code style enforcement:

```bash
# Check for linting errors
npm run lint

# Lint runs automatically in CI
```

### ESLint Configuration

- Based on `@typescript-eslint/recommended`
- Enforces semicolons
- Requires curly braces
- Enforces strict equality (`===`)

### Code Organization

- Keep `extension.ts` as the single entry point
- Extract complex logic into separate functions
- Add comments for non-obvious code
- Follow existing code patterns

## Releasing

This repository contains 3 packages that can be released independently or together.

### Version Management

**List current versions:**
```bash
npm run version:list
```

**Update all packages to the same version:**
```bash
npm run version:set 0.0.10
```

### Release Process

#### Option 1: Automatic Release (Recommended)

When you bump the version and push to main, the individual package workflows automatically detect version changes and trigger releases:

1. Update versions: `npm run version:set X.Y.Z`
2. Review changes: `git diff`
3. Commit: `git add . && git commit -m "chore: bump version to X.Y.Z"`
4. Push: `git push origin main`
5. GitHub Actions will automatically publish changed packages

#### Option 2: Manual Unified Release

Use the "Release All Extensions" workflow to publish all packages at once:

1. Ensure versions are already updated in package.json files
2. Go to GitHub Actions → "Release All Extensions"
3. Click "Run workflow"
4. Enter the version number
5. All three packages will be built, tested, and published in parallel

### Individual Package Releases

Each package has its own workflow that triggers on changes to its directory:
- `.github/workflows/publish-detekt.yml`
- `.github/workflows/publish-ktlint.yml`
- `.github/workflows/publish-ktfmt.yml`

These workflows automatically:
- Detect version changes in package.json
- Compile and test the package
- Create a GitHub Release with the VSIX file
- Publish to VS Code Marketplace (if credentials available)
- Publish to Open VSX (if credentials available)

## Additional Resources

### Documentation
- [Development Guide](docs/DEVELOPMENT.md) - Architecture, debugging, and internals
- [CI/CD Setup](docs/CI_CD_SETUP.md) - Continuous integration and deployment
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Changelog](CHANGELOG.md) - Version history
- [Version Script README](scripts/README.md) - Version management utilities

### External Resources
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Detekt Documentation](https://detekt.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Open an issue for bug reports or feature requests
- Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for common problems
- Review existing issues before creating new ones
- Join discussions in existing issues or PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
