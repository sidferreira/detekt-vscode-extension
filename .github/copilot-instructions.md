# Detekt VSCode Extension Development Guide

## Project Architecture

This is a VSCode extension that integrates **detekt** (Kotlin static analysis tool) into the editor. The extension runs detekt automatically on Kotlin file saves and provides manual project analysis via commands.

### Core Components

- **`src/extensions.ts`**: Single-file extension with activation/deactivation lifecycle
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
```

### Extension Development

- **F5**: Launch Extension Host with current code (`Run Extension` launch config)
- **Ctrl+Shift+P** → "Reload Window" to restart extension during development
- Use VSCode Output Channel "Detekt" for debugging extension logs

### Testing Strategy

**Integration tests** (`test/detekt.integration.test.ts`) mock VSCode APIs and run real detekt subprocess:

- Tests require `detekt` binary in PATH (skipped if not available)
- Mock objects: `mockDiagnosticCollection`, `mockOutputChannel`, `mockVscode`
- Test fixtures: `bad-example.kt` (triggers violations), `good-example.kt` (clean)

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

## Testing Requirements

- Jest with SWC transform (`@swc-node/jest`) for TypeScript
- 30-second timeout for integration tests (detekt execution)
- Mock VSCode module entirely for unit testing
- Compilation required before tests (`yarn compile && jest`)

## File Watching Behavior

Only Kotlin files (`.kt` extension, `languageId === 'kotlin'`) trigger analysis.
File path resolution handles both absolute paths and workspace-relative paths for diagnostic mapping.

## Common Gotchas

- Detekt returns non-zero exit codes when violations found (not an error)
- VSCode uses 0-based line/column numbers (detekt output is 1-based)
- Diagnostics must be cleared before each new analysis to avoid stale results
- Background process management critical to avoid zombie processes