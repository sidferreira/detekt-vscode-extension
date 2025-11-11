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

- [detekt](https://detekt.dev/) must be installed and available in your PATH or in your project
- detekt CLI should output in the format: `file.kt:line:column: message [RuleId]`

## Configuration

The extension uses the detekt configuration from your project root (`detekt.yml` or `detekt.yaml`).

## Extension Settings

This extension contributes the following settings:

* `detekt.enable`: Enable/disable the detekt extension
* `detekt.runOnSave`: Run detekt automatically when saving Kotlin files
* `detekt.executablePath`: Path to the detekt executable (defaults to 'detekt')

## Release Notes

### 1.0.0

Initial release:
- Auto-run detekt on Kotlin file save
- Manual command to run detekt on entire project
- Problems panel integration