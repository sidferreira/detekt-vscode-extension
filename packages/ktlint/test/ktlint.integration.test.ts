import { EventEmitter } from 'events';
import * as path from 'path';

// Create comprehensive VS Code mocks for integration testing
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

const mockConfiguration = {
    get: jest.fn((key: string, defaultValue?: any) => {
        switch (key) {
            case 'enable': return true;
            case 'runOnSave': return true;
            case 'formatOnSave': return false;
            case 'executablePath': return 'ktlint';
            case 'args': return [];
            default: return defaultValue;
        }
    })
};

const uriCache = new Map<string, any>();

const mockVscode = {
    languages: {
        createDiagnosticCollection: jest.fn(() => mockDiagnosticCollection)
    },
    window: {
        createOutputChannel: jest.fn(() => mockOutputChannel),
        setStatusBarMessage: jest.fn(() => mockStatusBarMessage),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        activeTextEditor: undefined
    },
    workspace: {
        getConfiguration: jest.fn(() => mockConfiguration),
        workspaceFolders: undefined,
        getWorkspaceFolder: jest.fn(),
        onDidSaveTextDocument: jest.fn()
    },
    commands: {
        registerCommand: jest.fn()
    },
    Uri: {
        file: jest.fn((path: string) => {
            if (!uriCache.has(path)) {
                uriCache.set(path, { fsPath: path, toString: () => path });
            }
            return uriCache.get(path);
        })
    },
    Range: jest.fn((start, end) => ({ start, end })),
    Position: jest.fn((line, char) => ({ line, character: char })),
    Diagnostic: jest.fn(function(range, message, severity) {
        return { range, message, severity };
    }),
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

jest.mock('vscode', () => mockVscode, { virtual: true });

describe('ktlint Integration Test Suite', () => {
    let extension: any;

    beforeEach(() => {
        jest.clearAllMocks();
        uriCache.clear();
        extension = require('../src/extension');
    });

    test('Extension activates without errors', () => {
        const mockContext = {
            subscriptions: []
        };

        expect(() => {
            extension.activate(mockContext);
        }).not.toThrow();

        expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith('ktlint');
        expect(mockVscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('ktlint');
        expect(mockVscode.commands.registerCommand).toHaveBeenCalledWith(
            'ktlint.runAnalysis',
            expect.any(Function)
        );
        expect(mockVscode.commands.registerCommand).toHaveBeenCalledWith(
            'ktlint.formatDocument',
            expect.any(Function)
        );
    });

    test('parseKtlintOutput function parses real ktlint output correctly', () => {
        const mockContext = {
            subscriptions: []
        };
        extension.activate(mockContext);

        const workspacePath = '/workspace';
        const sampleOutput = `/workspace/src/Main.kt:10:1: Unnecessary semicolon (no-semi)
/workspace/src/Main.kt:15:5: Missing newline before } (trailing-comma)`;

        const diagnosticsMap = extension.parseKtlintOutput(sampleOutput, workspacePath);
        
        expect(diagnosticsMap.size).toBe(1);
        const diagnostics = diagnosticsMap.get(uriCache.get(path.join(workspacePath, 'src/Main.kt')));
        expect(diagnostics).toBeDefined();
        expect(diagnostics?.length).toBe(2);
    });

    test('Extension deactivates without errors', () => {
        const mockContext = {
            subscriptions: []
        };

        extension.activate(mockContext);
        
        expect(() => {
            extension.deactivate();
        }).not.toThrow();
    });
});
