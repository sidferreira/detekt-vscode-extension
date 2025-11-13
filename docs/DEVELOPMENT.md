# Development Guide

This guide covers development workflow, architecture, and best practices for the Detekt VSCode Extension.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/sidferreira/detekt-vscode-extension.git
cd detekt-vscode-extension
npm install

# Development
npm run compile      # or npm run watch for auto-compilation
```

Press `F5` in VSCode to launch the Extension Development Host.

## Project Architecture

### Overview

This VSCode extension integrates **detekt** (Kotlin static analysis tool) into the editor. The extension runs detekt automatically on Kotlin file saves and provides manual project analysis via commands.

### Core Components

- **`src/extension.ts`**: Single-file extension with activation/deactivation lifecycle
- **Test fixtures**: `test/fixtures/` contains Kotlin files for integration testing
- **Build output**: TypeScript compiles to `dist/` directory

### Key Data Flow

1. **File save trigger** → detekt subprocess → parse CLI output → VSCode diagnostics
2. **Manual command** → full project analysis → diagnostics collection update
3. **Output parsing**: Regex pattern `/^(.+\.kt):(\d+):(\d+):\s+(.+?)\s+\[(.+?)\]$/gm` for detekt CLI format

## Development Workflow

### Build & Test Commands

```bash
npm run compile          # TypeScript compilation to dist/
npm run watch           # Watch mode for development
npm run test            # Jest integration tests
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Coverage reporting
npm run lint            # ESLint checking
```

### Extension Development

- **F5**: Launch Extension Host with current code (`Run Extension` launch config)
- **Ctrl+Shift+P** → "Reload Window" to restart extension during development
- Use VSCode Output Channel "Detekt" for debugging extension logs

### Making Changes

1. Edit `src/extension.ts`
2. Compile with `npm run compile` (or use watch mode)
3. Press `F5` or reload the Extension Development Host
4. Test your changes with actual Kotlin files
5. Run tests: `npm test`
6. Check linting: `npm run lint`

## Testing Strategy

### Integration Tests

**Location**: `test/detekt.integration.test.ts`

Tests mock VSCode APIs and run real detekt subprocess:

- Tests require `detekt` binary in PATH (skipped if not available)
- Mock objects: `mockDiagnosticCollection`, `mockOutputChannel`, `mockVscode`
- Test fixtures: `bad-example.kt` (triggers violations), `good-example.kt` (clean)

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

### Testing Requirements

- Jest with SWC transform (`@swc-node/jest`) for TypeScript
- 30-second timeout for integration tests (detekt execution)
- Mock VSCode module entirely for unit testing
- Compilation required before tests (`npm run compile && jest`)

## Extension-Specific Patterns

### Configuration Management

```typescript
const config = vscode.workspace.getConfiguration('detekt');
const enabled = config.get<boolean>('enable', true);
```

Settings in `package.json` contribute section:
- `detekt.enable`: master switch
- `detekt.runOnSave`: auto-analysis toggle  
- `detekt.executablePath`: custom detekt binary path
- `detekt.args`: additional CLI arguments array

### Process Management

```typescript
// Cancel previous runs to avoid concurrent processes
if (runningProcess) {
    runningProcess.kill();
    runningProcess = null;
}
```

### Diagnostic Creation Pattern

```typescript
const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
diagnostic.code = ruleId;
diagnostic.source = 'detekt';
```

## Critical Dependencies

- **detekt CLI**: External binary, not bundled with extension
- **VSCode API**: 1.75.0+ engine requirement
- **Child processes**: Node.js `spawn()` for detekt subprocess management

## File Watching Behavior

- Only Kotlin files (`.kt` extension, `languageId === 'kotlin'`) trigger analysis
- File path resolution handles both absolute paths and workspace-relative paths
- Diagnostic mapping accounts for 1-based (detekt) to 0-based (VSCode) conversion

## Common Gotchas

- **Exit codes**: Detekt returns non-zero exit codes when violations found (not an error)
- **Line numbers**: VSCode uses 0-based line/column numbers (detekt output is 1-based)
- **Diagnostics clearing**: Must clear diagnostics before each new analysis to avoid stale results
- **Process management**: Background process management critical to avoid zombie processes
- **Path handling**: Support both absolute and workspace-relative file paths

## Code Style

### ESLint Configuration

The project uses ESLint with TypeScript support:

```bash
npm run lint    # Check for issues
```

Rules enforced:
- Semicolons required
- Curly braces for control structures
- Strict equality (`===`)
- No explicit `any` types discouraged

### TypeScript Configuration

- Target: ES2020
- Strict mode enabled
- Source maps generated for debugging
- Output to `dist/` directory

## Debugging

### Extension Debugging

1. Set breakpoints in `src/extension.ts`
2. Press `F5` to start debugging
3. The Extension Development Host will launch with debugger attached
4. Open a Kotlin file to trigger breakpoints

### Output Channel

The extension creates a "Detekt" output channel for logging:

```typescript
outputChannel.appendLine("Running detekt...");
```

View it via: View → Output → Select "Detekt" from dropdown

### Common Debug Scenarios

**Extension not activating:**
- Check activation events in `package.json`
- Check output channel for errors

**Detekt not running:**
- Verify detekt is in PATH: `which detekt` or `detekt --version`
- Check output channel for subprocess errors
- Verify `detekt.enable` and `detekt.runOnSave` settings

**Diagnostics not showing:**
- Check regex pattern matches detekt output format
- Verify file paths are resolved correctly
- Check if diagnostics collection is cleared properly

## Packaging & Publishing

### Creating VSIX Package

```bash
npm run package         # Creates .vsix in root
npm run package:out     # Creates .vsix in dist/
```

### Publishing

Publishing is automated via GitHub Actions when tags are pushed:

```bash
git tag v0.0.10
git push origin v0.0.10
```

See [CI_CD_SETUP.md](CI_CD_SETUP.md) for complete CI/CD documentation.

### Manual Publishing

```bash
# To VS Code Marketplace
npm run publish -- --pat YOUR_PAT

# To Open VSX
npx ovsx publish --pat YOUR_PAT
```

## Project Structure

```
detekt-vscode-extension/
├── .github/
│   ├── copilot-instructions.md    # AI assistant instructions
│   └── workflows/
│       └── publish.yml             # CI/CD pipeline
├── .vscode/
│   └── launch.json                 # Debug configurations
├── docs/
│   ├── CI_CD_SETUP.md             # CI/CD documentation
│   ├── DEVELOPMENT.md             # This file
│   └── TROUBLESHOOTING.md         # Problem-solving guide
├── src/
│   └── extension.ts               # Main extension code
├── test/
│   ├── fixtures/                  # Test Kotlin files
│   │   ├── bad-example.kt
│   │   └── good-example.kt
│   └── detekt.integration.test.ts # Integration tests
├── dist/                          # Compiled output (gitignored)
├── CHANGELOG.md                   # Version history
├── CONTRIBUTING.md                # Contribution guidelines
├── README.md                      # User documentation
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
├── jest.config.js                 # Jest config
├── .eslintrc.json                # ESLint config
└── .vscodeignore                 # Files excluded from VSIX
```

## Additional Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [VSCode Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Detekt Documentation](https://detekt.dev/)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Getting Help

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Open an issue on GitHub for bugs or feature requests
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
