# Detekt VSCode Extension

A VSCode extension that automatically runs detekt on Kotlin files and displays problems in the Problems panel.

## Features

- 🔄 **Auto-run on save**: Automatically runs detekt when you save a Kotlin file
- 🎯 **Manual analysis**: Run detekt on the entire project with a command
- 📋 **Problems panel integration**: See all detekt findings in VSCode's Problems panel
- ⚡ **Real-time feedback**: Get instant feedback on code quality issues

## Installation

Install from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/) or search for "Detekt" in the Extensions view (`Ctrl+Shift+X`).

## Quick Start

1. Install the extension
2. Ensure detekt is installed and available in your PATH (or configure a custom path)
3. Open a Kotlin project
4. Save a `.kt` file to trigger automatic analysis

## Usage

### Automatic Analysis
Simply save any Kotlin file (`.kt`) and detekt will run automatically.

### Manual Analysis
- Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
- Type "Detekt: Run Analysis on Project"
- Press Enter

## Requirements

- **detekt must be installed** and available in your PATH
  - Install detekt: https://detekt.dev/docs/intro
- The extension assumes you have a working `detekt` command (or you can configure a custom path in settings)
- Detekt CLI should output in the format: `file.kt:line:column: message [RuleId]`

## Configuration

The extension uses the detekt configuration from your project root (`detekt.yml` or `detekt.yaml`).

### Extension Settings

This extension contributes the following settings:

* `detekt.enable`: Enable/disable the detekt extension (default: `true`)
* `detekt.runOnSave`: Run detekt automatically when saving Kotlin files (default: `true`)
* `detekt.executablePath`: Path to the detekt executable or command (default: `"detekt"`)
* `detekt.args`: Additional arguments to pass to detekt (default: `[]`)

### Example Configuration

```json
{
  "detekt.executablePath": "/usr/local/bin/detekt",
  "detekt.args": ["--config", "custom-detekt.yml", "--parallel"]
}
```

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development setup and contribution guidelines
- [CI/CD Setup](docs/CI_CD_SETUP.md) - Continuous integration and deployment guide
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and contribution guidelines.

### Quick Commands

```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript
npm run watch        # Watch mode for development
npm test             # Run tests
npm run lint         # Run ESLint
```

## Troubleshooting

Having issues? Check out our [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for common problems and solutions.

## License

[MIT](LICENSE)

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for a detailed version history.

### Latest Release (0.0.9)

- Auto-run detekt on Kotlin file save
- Manual command to run detekt on entire project
- Problems panel integration
- Configurable detekt executable path
- Support for additional detekt arguments