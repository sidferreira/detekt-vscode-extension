import * as path from 'path';

// Create comprehensive VS Code mocks for unit testing
const mockDiagnosticCollection = {
    clear: jest.fn(),
    delete: jest.fn(),
    set: jest.fn(),
    dispose: jest.fn()
};

const mockOutputChannel = {
    appendLine: jest.fn(),
    dispose: jest.fn()
};

const mockStatusBarMessage = {
    dispose: jest.fn()
};

const mockWorkspaceFolders = [
    {
        uri: { fsPath: path.resolve(__dirname, '..') },
        name: 'detekt-vscode-extension',
        index: 0
    }
];

const mockConfiguration = {
    get: jest.fn((key: string, defaultValue?: any) => {
        switch (key) {
            case 'enable': return true;
            case 'runOnSave': return true;
            case 'executablePath': return 'detekt';
            case 'args': return [];
            default: return defaultValue;
        }
    })
};

const uriCache = new Map<string, any>();

const mockVscode = {
    workspace: {
        workspaceFolders: mockWorkspaceFolders,
        getConfiguration: jest.fn(() => mockConfiguration),
        getWorkspaceFolder: jest.fn(() => mockWorkspaceFolders[0]),
        onDidSaveTextDocument: jest.fn()
    },
    window: {
        createOutputChannel: jest.fn(() => mockOutputChannel),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        setStatusBarMessage: jest.fn(() => mockStatusBarMessage)
    },
    languages: {
        createDiagnosticCollection: jest.fn(() => mockDiagnosticCollection)
    },
    commands: {
        registerCommand: jest.fn((command, callback) => {
            return { dispose: () => {} };
        })
    },
    Uri: {
        file: jest.fn((path: string) => {
            if (!uriCache.has(path)) {
                uriCache.set(path, { 
                    fsPath: path, 
                    toString: () => `file://${path}`,
                    scheme: 'file'
                });
            }
            return uriCache.get(path);
        })
    },
    Position: jest.fn((line: number, character: number) => ({ line, character })),
    Range: jest.fn((start: any, end: any) => ({ start, end })),
    Diagnostic: jest.fn((range: any, message: string, severity?: number) => ({
        range,
        message,
        severity,
        code: '',
        source: ''
    })),
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

// Mock the vscode module
jest.mock('vscode', () => mockVscode, { virtual: true });

describe('Detekt Unit Test Suite - Diagnostic Counting', () => {
    let extensionModule: any;

    beforeAll(async () => {
        // Import the compiled extension
        delete require.cache[require.resolve('../dist/extension.js')];
        extensionModule = require('../dist/extension.js');
    });

    beforeEach(() => {
        // Clear mock function calls between tests
        jest.clearAllMocks();
        uriCache.clear();
    });

    test('parseDetektOutput returns empty map for empty output', () => {
        const workspacePath = '/test/workspace';
        const output = '';
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap).toBeInstanceOf(Map);
        expect(diagnosticsMap.size).toBe(0);
    });

    test('parseDetektOutput counts single diagnostic correctly', () => {
        const workspacePath = '/test/workspace';
        const output = '/test/workspace/Example.kt:1:1: Line must not be longer than 120 characters (current length is 157) [MaxLineLength]';
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap.size).toBe(1);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0].message).toBe('Line must not be longer than 120 characters (current length is 157)');
        expect(diagnostics[0].code).toBe('MaxLineLength');
        expect(diagnostics[0].source).toBe('detekt');
    });

    test('parseDetektOutput counts multiple diagnostics for same file', () => {
        const workspacePath = '/test/workspace';
        const output = `
/test/workspace/Example.kt:1:1: Line must not be longer than 120 characters (current length is 157) [MaxLineLength]
/test/workspace/Example.kt:5:5: Missing newline after class header [NewLineAfterClassHeader]
/test/workspace/Example.kt:10:20: Unnecessary safe call on a non-null receiver of type Example [UnnecessarySafeCall]
        `.trim();
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap.size).toBe(1);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBe(3);
    });

    test('parseDetektOutput counts diagnostics across multiple files', () => {
        const workspacePath = '/test/workspace';
        const output = `
/test/workspace/File1.kt:1:1: Issue in file 1 [Rule1]
/test/workspace/File1.kt:2:1: Another issue in file 1 [Rule2]
/test/workspace/File2.kt:1:1: Issue in file 2 [Rule3]
/test/workspace/File3.kt:5:10: Issue in file 3 [Rule4]
/test/workspace/File3.kt:7:1: Another issue in file 3 [Rule5]
        `.trim();
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap.size).toBe(3);
        
        // Count total diagnostics across all files
        const totalDiagnostics = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);
        
        expect(totalDiagnostics).toBe(5);
        
        // Verify individual file diagnostic counts
        const file1Uri = mockVscode.Uri.file('/test/workspace/File1.kt');
        const file2Uri = mockVscode.Uri.file('/test/workspace/File2.kt');
        const file3Uri = mockVscode.Uri.file('/test/workspace/File3.kt');
        
        expect(diagnosticsMap.get(file1Uri)?.length).toBe(2);
        expect(diagnosticsMap.get(file2Uri)?.length).toBe(1);
        expect(diagnosticsMap.get(file3Uri)?.length).toBe(2);
    });

    test('parseDetektOutput counts exactly 13 diagnostics for bad-example.kt output', () => {
        const workspacePath = '/test/workspace';
        // Simulate typical detekt output for bad-example.kt
        const output = `
/test/workspace/bad-example.kt:1:1: Line must not be longer than 120 characters (current length is 157) [MaxLineLength]
/test/workspace/bad-example.kt:2:1: Missing newline after package statement [PackageStatementSpacing]
/test/workspace/bad-example.kt:3:8: Function names should be in camelCase [FunctionNaming]
/test/workspace/bad-example.kt:4:5: Magic number found [MagicNumber]
/test/workspace/bad-example.kt:5:10: Unnecessary safe call [UnnecessarySafeCall]
/test/workspace/bad-example.kt:6:1: Too many blank lines [TooManyBlankLines]
/test/workspace/bad-example.kt:7:15: Empty catch block [EmptyCatchBlock]
/test/workspace/bad-example.kt:8:20: Variable declaration without type [VariableDeclarationWithoutType]
/test/workspace/bad-example.kt:9:5: Unused import [UnusedImport]
/test/workspace/bad-example.kt:10:1: Missing documentation [UndocumentedPublicFunction]
/test/workspace/bad-example.kt:11:8: Complex method [ComplexMethod]
/test/workspace/bad-example.kt:12:12: Long method [LongMethod]
/test/workspace/bad-example.kt:13:3: Trailing comma [TrailingComma]
        `.trim();
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap.size).toBe(1);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBe(13);
    });

    test('parseDetektOutput ignores malformed lines and counts only valid diagnostics', () => {
        const workspacePath = '/test/workspace';
        const output = `
/test/workspace/Example.kt:1:1: Valid diagnostic [Rule1]
This is not a valid diagnostic line
/test/workspace/Example.kt:2:1: Another valid diagnostic [Rule2]
Random text that should be ignored
/test/workspace/Example.kt:3:1: Third valid diagnostic [Rule3]
        `.trim();
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap.size).toBe(1);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBe(3);
    });

    test('parseDetektOutput handles relative paths correctly', () => {
        const workspacePath = '/test/workspace';
        const output = `
src/main/kotlin/Example.kt:1:1: Issue in relative path [Rule1]
src/test/kotlin/Test.kt:5:5: Issue in test file [Rule2]
        `.trim();
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap.size).toBe(2);
        
        const totalDiagnostics = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);
        
        expect(totalDiagnostics).toBe(2);
    });

    test('parseDetektOutput counts zero diagnostics for clean output', () => {
        const workspacePath = '/test/workspace';
        const output = 'Detekt analysis completed successfully with no issues found.';
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        expect(diagnosticsMap.size).toBe(0);
        
        const totalDiagnostics = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);
        
        expect(totalDiagnostics).toBe(0);
    });

    test('parseDetektOutput verifies diagnostic properties are set correctly', () => {
        const workspacePath = '/test/workspace';
        const output = '/test/workspace/Example.kt:10:5: Test message [TestRule]';
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBe(1);
        
        const diagnostic = diagnostics[0];
        expect(diagnostic.message).toBe('Test message');
        expect(diagnostic.code).toBe('TestRule');
        expect(diagnostic.source).toBe('detekt');
        expect(diagnostic.range.start.line).toBe(9); // 0-based
        expect(diagnostic.range.start.character).toBe(4); // 0-based
    });

    test('parseDetektOutput counts diagnostics with long multiline messages', () => {
        const workspacePath = '/test/workspace';
        const output = `
/test/workspace/Example.kt:1:1: This is a very long error message that might span multiple lines in the output but should still be counted as a single diagnostic [LongMessageRule]
/test/workspace/Example.kt:2:1: Another diagnostic [Rule2]
        `.trim();
        
        const diagnosticsMap = extensionModule.parseDetektOutput(output, workspacePath);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBe(2);
    });
});
