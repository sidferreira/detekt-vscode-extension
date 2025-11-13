# ktfmt VS Code Extension

Format Kotlin code using ktfmt (Kotlin formatter by Google).

## Features

- **Format Current File**: Format the currently open Kotlin file
- **Format Workspace**: Format all Kotlin files in the workspace
- **Format on Save**: Format files automatically when saving (enabled by default)
- **Configurable**: Customize ktfmt executable path and arguments

## Requirements

You need to have `ktfmt` installed and available in your PATH, or configure the path to the ktfmt executable.

### Installing ktfmt

You can install ktfmt using various methods:

**Using brew (macOS):**
```bash
brew install ktfmt
```

**Using sdkman:**
```bash
sdk install ktfmt
```

**Or download from releases:**
https://github.com/facebook/ktfmt/releases

## Extension Settings

This extension contributes the following settings:

* `ktfmt.enable`: Enable/disable the ktfmt extension (default: `true`)
* `ktfmt.formatOnSave`: Format Kotlin files automatically when saving (default: `true`)
* `ktfmt.executablePath`: Path to the ktfmt executable (default: `"ktfmt"`)
* `ktfmt.args`: Additional arguments to pass to ktfmt (default: `[]`)

## Commands

This extension contributes the following commands:

* `ktfmt: Format Current File`: Format the currently open Kotlin file
* `ktfmt: Format All Kotlin Files in Workspace`: Format all Kotlin files in the workspace

## Usage

1. Open a Kotlin file (`.kt`)
2. The file will be automatically formatted on save (default behavior)
3. Or use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for "ktfmt"
4. Select the desired command

To disable format on save:
```json
{
  "ktfmt.formatOnSave": false
}
```

## License

MIT

## Author

SidFerreira
