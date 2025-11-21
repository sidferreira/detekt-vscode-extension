# Detekt VSCode Extension

A VSCode extension that automatically runs detekt on Kotlin files and displays problems in the Problems panel.

## Features

- 🔄 **Auto-run on save**: Automatically runs detekt when you save a Kotlin file
- 🎯 **Manual analysis**: Run detekt on the entire project with a command
- 📋 **Problems panel integration**: See all detekt findings in VSCode's Problems panel
- ⚡ **Real-time feedback**: Get instant feedback on code quality issues

## Usage

### Automatic Analysis
Simply save any Kotlin file (`.kt`) and detekt will run automatically.

### Manual Analysis
- Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
- Type "Detekt: Run Analysis on Project"
- Press Enter

## Requirements

- **detekt must be installed globally** or available in your PATH
- The extension assumes you have a working `detekt` command (or you can configure a custom path in settings)
- Detekt CLI should output in the format: `file.kt:line:column: message [RuleId]`

## Configuration

The extension uses the detekt configuration from your project root (`detekt.yml` or `detekt.yaml`).

## Extension Settings

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

## Release Notes

### 1.0.0

Initial release:
- Auto-run detekt on Kotlin file save
- Manual command to run detekt on entire project
- Problems panel integration