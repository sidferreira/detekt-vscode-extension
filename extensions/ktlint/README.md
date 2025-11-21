# ktlint VS Code Extension

Run ktlint analysis on Kotlin files and display results in the Problems panel. Also supports formatting with ktlint.

## Features

- **Automatic Analysis on Save**: Run ktlint automatically when saving Kotlin files
- **Manual Analysis**: Run ktlint analysis on the entire project via command
- **Format Current File**: Format files using ktlint's built-in formatter
- **Format on Save**: Optionally format files automatically when saving (disabled by default)
- **Problems Panel Integration**: View ktlint issues directly in VS Code's Problems panel
- **Configurable**: Customize ktlint executable path and arguments

## Requirements

You need to have `ktlint` installed and available in your PATH, or configure the path to the ktlint executable.

### Installing ktlint

You can install ktlint using various methods:

**Using brew (macOS):**
```bash
brew install ktlint
```

**Using sdkman:**
```bash
sdk install ktlint
```

**Or download from releases:**
https://github.com/pinterest/ktlint/releases

## Extension Settings

This extension contributes the following settings:

* `ktlint.enable`: Enable/disable the ktlint extension (default: `true`)
* `ktlint.runOnSave`: Run ktlint automatically when saving Kotlin files (default: `true`)
* `ktlint.formatOnSave`: Format Kotlin files automatically when saving (default: `false`)
* `ktlint.executablePath`: Path to the ktlint executable (default: `"ktlint"`)
* `ktlint.args`: Additional arguments to pass to ktlint (default: `[]`)

## Commands

This extension contributes the following commands:

* `ktlint: Run Analysis on Project`: Run ktlint analysis on the entire project
* `ktlint: Format Current File`: Format the currently open Kotlin file using ktlint

## Usage

### For Analysis
1. Open a Kotlin file (`.kt`)
2. Save the file to trigger automatic analysis (if enabled)
3. View issues in the Problems panel

Or run manual analysis:
- Use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
- Search for "ktlint: Run Analysis on Project"

### For Formatting
1. Open a Kotlin file (`.kt`)
2. Use the command palette and search for "ktlint: Format Current File"

Or enable format on save:
```json
{
  "ktlint.formatOnSave": true
}
```

## License

MIT

## Author

SidFerreira
