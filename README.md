# Kotlin Tooling Extensions Monorepo

This monorepo contains VS Code extensions for Kotlin development tooling:

## Extensions

### 1. [Detekt](./packages/detekt) - Kotlin Static Analysis
Run detekt analysis on Kotlin files and display results in the Problems panel.

**Features:**
- Automatic analysis on file save
- Manual analysis command
- Configurable detekt executable path
- Custom arguments support

### 2. [ktfmt](./packages/ktfmt) - Kotlin Code Formatter
Format Kotlin code using ktfmt (Kotlin formatter by Google).

**Features:**
- Format current file
- Format entire workspace
- Format on save (enabled by default)
- Configurable ktfmt executable path
- Custom arguments support

### 3. [ktlint](./packages/ktlint) - Kotlin Linter
Run ktlint analysis on Kotlin files with built-in formatting capabilities.

**Features:**
- Automatic analysis on file save (enabled by default)
- Manual analysis command
- Format current file with ktlint
- Format on save (optional)
- Configurable ktlint executable path
- Custom arguments support

## Installation

Install from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/) or search for the extension name (Detekt, ktfmt, or ktlint) in the Extensions view (`Ctrl+Shift+X`).

## Requirements

Each extension requires its respective tool to be installed:
- **detekt**: https://detekt.dev/docs/intro
- **ktfmt**: https://github.com/facebook/ktfmt
- **ktlint**: https://github.com/pinterest/ktlint

The extensions assume the tools are available in your PATH, or you can configure custom paths in settings.

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines and setup
- [Development Guide](docs/DEVELOPMENT.md) - Architecture, debugging, and development workflow
- [CI/CD Setup](docs/CI_CD_SETUP.md) - Continuous integration and deployment guide
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Development

This is a npm workspaces monorepo. To work with it:

### Install Dependencies
```bash
npm install
```

### Build All Packages
```bash
npm run compile
```

### Test All Packages
```bash
npm run test
```

### Watch Mode (for development)
```bash
npm run watch
```

### Lint All Packages
```bash
npm run lint
```

### Package Extensions
```bash
npm run package
```

## Working with Individual Packages

You can also work with individual packages:

```bash
# Navigate to a specific package
cd packages/detekt

# Install dependencies
npm install

# Build
npm run compile

# Test
npm run test

# Package
npm run package
```

## Publishing

Each extension can be published independently. See the individual package READMEs for specific publishing instructions.

The GitHub Actions workflow automatically publishes extensions when their versions are updated in their respective `package.json` files.

## Troubleshooting

Having issues? Check out our [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for common problems and solutions.

## License

MIT - See [LICENSE](./LICENSE) file for details.

## Author

SidFerreira
