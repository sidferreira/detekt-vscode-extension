# Contributing to Detekt VSCode Extension

Thank you for your interest in contributing to the Detekt VSCode Extension! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)

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

3. **Compile the extension**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
detekt-vscode-extension/
├── .github/              # GitHub configuration and workflows
│   └── workflows/        # CI/CD workflows
├── .vscode/              # VSCode settings and launch configurations
├── docs/                 # Documentation files
│   ├── CI_CD_SETUP.md   # CI/CD setup guide
│   └── TROUBLESHOOTING.md # Troubleshooting guide
├── src/                  # Source code
│   └── extension.ts      # Main extension code
├── test/                 # Test files
│   ├── fixtures/         # Test fixtures (Kotlin files)
│   └── *.test.ts        # Test files
├── dist/                 # Compiled output (generated)
├── CHANGELOG.md          # Version history
├── CONTRIBUTING.md       # This file
├── README.md             # User-facing documentation
└── package.json          # Extension manifest
```

## Development Workflow

### Building

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

### Running the Extension

1. Open the project in VSCode
2. Press `F5` to launch the Extension Development Host
3. This opens a new VSCode window with the extension loaded
4. Open a Kotlin project to test the extension

### Making Changes

1. Create a new branch for your feature/fix
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes in the `src/` directory

3. Compile and test your changes
   ```bash
   npm run compile
   npm test
   ```

4. Test the extension manually in the Extension Development Host

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

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Detekt Documentation](https://detekt.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Open an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Join discussions in existing issues or PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
