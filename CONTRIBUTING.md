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

## Additional Resources

### Documentation
- [Development Guide](docs/DEVELOPMENT.md) - Architecture, debugging, and internals
- [CI/CD Setup](docs/CI_CD_SETUP.md) - Continuous integration and deployment
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Changelog](CHANGELOG.md) - Version history

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
