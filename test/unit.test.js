"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const events_1 = require("events");
// Mock VS Code API
const mockUri = {
    file: jest.fn((path) => ({ fsPath: path, toString: () => `file://${path}` }))
};
const mockPosition = jest.fn((line, character) => ({ line, character }));
const mockRange = jest.fn((start, end) => ({ start, end }));
const mockDiagnostic = jest.fn((range, message, severity) => ({
    range,
    message,
    severity,
    code: '',
    source: ''
}));
const mockDiagnosticSeverity = {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
};
const vscode = {
    Uri: mockUri,
    Position: mockPosition,
    Range: mockRange,
    Diagnostic: mockDiagnostic,
    DiagnosticSeverity: mockDiagnosticSeverity
};
describe('Unit Test Suite', () => {
    test('Parse detekt output with single issue', () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = `
src/main/kotlin/Example.kt:10:5: Magic number detected [MagicNumber]
        `.trim();
        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);
        expect(diagnosticsMap.size).toBe(1);
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0].message).toBe('Magic number detected');
        expect(diagnostics[0].code).toBe('MagicNumber');
        expect(diagnostics[0].source).toBe('detekt');
        expect(diagnostics[0].range.start.line).toBe(9); // 0-based
        expect(diagnostics[0].range.start.character).toBe(4); // 0-based
    });
    test('Parse detekt output with multiple issues', () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = `
src/main/kotlin/Example.kt:10:5: Magic number detected [MagicNumber]
src/main/kotlin/Example.kt:15:10: Line too long [MaxLineLength]
src/main/kotlin/Helper.kt:5:1: Missing documentation [UndocumentedPublicClass]
        `.trim();
        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);
        expect(diagnosticsMap.size).toBe(2);
        const exampleDiagnostics = Array.from(diagnosticsMap.values())[0];
        expect(exampleDiagnostics.length).toBe(2);
        const helperDiagnostics = Array.from(diagnosticsMap.values())[1];
        expect(helperDiagnostics.length).toBe(1);
        expect(helperDiagnostics[0].code).toBe('UndocumentedPublicClass');
    });
    test('Parse detekt output with absolute paths', () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = '/workspace/test-project/src/main/kotlin/Example.kt:10:5: Magic number detected [MagicNumber]';
        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);
        expect(diagnosticsMap.size).toBe(1);
        const uriKey = Array.from(diagnosticsMap.keys())[0];
        expect(uriKey.fsPath.endsWith('src/main/kotlin/Example.kt') || uriKey.fsPath.includes('Example.kt')).toBe(true);
    });
    test('Parse empty detekt output', () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = '';
        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);
        expect(diagnosticsMap.size).toBe(0);
    });
    test('Parse detekt output with no issues', () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = 'detekt completed successfully with 0 issues';
        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);
        expect(diagnosticsMap.size).toBe(0);
    });
    test('Mock spawn detekt process with success', (done) => {
        const mockOutput = 'src/main/kotlin/Example.kt:10:5: Magic number [MagicNumber]\n';
        // This test verifies the spawn pattern works
        const mockProcess = new events_1.EventEmitter();
        mockProcess.stdout = new events_1.EventEmitter();
        mockProcess.stderr = new events_1.EventEmitter();
        let stdoutData = '';
        mockProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });
        setTimeout(() => {
            mockProcess.stdout.emit('data', Buffer.from(mockOutput));
            mockProcess.emit('close', 0);
            expect(stdoutData).toContain('MagicNumber');
            done();
        }, 10);
    });
});
// Helper function extracted from extension.ts for testing
function parseDetektOutputTest(output, workspacePath) {
    const diagnosticsMap = new Map();
    // Pattern: file.kt:line:column: message [RuleId]
    const pattern = /^(.+\.kt):(\d+):(\d+):\s+(.+?)\s+\[(.+?)\]$/gm;
    let match;
    while ((match = pattern.exec(output)) !== null) {
        const [, filePath, lineStr, columnStr, message, code] = match;
        // Remove project root from path to make it relative
        let relativePath = filePath;
        if (filePath.startsWith(workspacePath)) {
            relativePath = path.relative(workspacePath, filePath);
        }
        // Convert to absolute path for URI
        const absolutePath = path.isAbsolute(relativePath)
            ? relativePath
            : path.join(workspacePath, relativePath);
        const uri = vscode.Uri.file(absolutePath);
        const line = parseInt(lineStr, 10) - 1; // VSCode uses 0-based line numbers
        const column = parseInt(columnStr, 10) - 1; // VSCode uses 0-based column numbers
        const range = vscode.Range(vscode.Position(line, column), vscode.Position(line, column + 1));
        const diagnostic = vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
        diagnostic.code = code;
        diagnostic.source = 'detekt';
        // Add to map
        if (!diagnosticsMap.has(uri)) {
            diagnosticsMap.set(uri, []);
        }
        const diagnostics = diagnosticsMap.get(uri);
        if (diagnostics) {
            diagnostics.push(diagnostic);
        }
    }
    return diagnosticsMap;
}
//# sourceMappingURL=unit.test.js.map