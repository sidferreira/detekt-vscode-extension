import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

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

const mockWorkspaceFolders = [
    {
        uri: { fsPath: path.resolve(__dirname, '..') },
        name: 'ktlint-vscode-extension',
        index: 0
    }
];

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
        setStatusBarMessage: jest.fn(() => mockStatusBarMessage),
        activeTextEditor: undefined
    },
    commands: {
        registerCommand: jest.fn((command, callback) => {
            (global as any).mockCommands = (global as any).mockCommands || {};
            (global as any).mockCommands[command] = callback;
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

jest.mock('vscode', () => mockVscode, { virtual: true });

describe('ktlint Integration Test Suite', () => {
    let extensionModule: any;
    let mockContext: any;

    beforeAll(async () => {
        jest.clearAllMocks();

        mockContext = {
            subscriptions: []
        };

        delete require.cache[require.resolve('../dist/extension.js')];
        extensionModule = require('../dist/extension.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockDiagnosticCollection.set.mockClear();
        mockDiagnosticCollection.delete.mockClear();
        mockOutputChannel.appendLine.mockClear();
        (global as any).mockCommands = {};
        uriCache.clear();
        
        delete require.cache[require.resolve('../dist/extension.js')];
        extensionModule = require('../dist/extension.js');
    });

    test('Extension activates without errors', () => {
        expect(() => {
            extensionModule.activate(mockContext);
        }).not.toThrow();
        
        expect(mockVscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('ktlint');
        expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith('ktlint');
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Very simple ktlint extension is now active');
    });

    test('parseKtlintOutput function parses real ktlint output correctly', async () => {
        const isInstalled = await checkKtlintInstalled();
        if (!isInstalled) {
            console.log('ktlint not installed, skipping test');
            return;
        }

        extensionModule.activate(mockContext);

        // Create a temporary test file with issues
        const testFilePath = path.join(__dirname, 'temp-test.kt');
        const testContent = 'fun test( ){println("hello") ;}';
        fs.writeFileSync(testFilePath, testContent);

        try {
            const ktlintOutput = await runKtlint(testFilePath);
            
            if (ktlintOutput.trim()) {
                const diagnosticsMap = extensionModule.parseKtlintOutput(ktlintOutput, path.dirname(testFilePath));
                
                expect(diagnosticsMap).toBeInstanceOf(Map);
                
                // If ktlint found issues, verify they were parsed
                if (diagnosticsMap.size > 0) {
                    const diagnostics = Array.from(diagnosticsMap.values())[0] as any[];
                    expect(Array.isArray(diagnostics)).toBe(true);
                    expect(diagnostics.length).toBeGreaterThan(0);
                    
                    const firstDiagnostic = diagnostics[0];
                    expect(firstDiagnostic).toHaveProperty('range');
                    expect(firstDiagnostic).toHaveProperty('message');
                    expect(firstDiagnostic).toHaveProperty('code');
                    expect(firstDiagnostic.source).toBe('ktlint');
                }
            }
        } finally {
            // Clean up
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    }, 30000);

    test('Save event triggers real ktlint analysis via compiled extension', async () => {
        const isInstalled = await checkKtlintInstalled();
        if (!isInstalled) {
            console.log('ktlint not installed, skipping test');
            return;
        }

        jest.clearAllMocks();
        mockDiagnosticCollection.set.mockClear();
        mockDiagnosticCollection.delete.mockClear();
        mockOutputChannel.appendLine.mockClear();
        
        let saveEventHandler: any = null;
        
        const mockOnSave = jest.fn((callback) => {
            saveEventHandler = callback;
            return { dispose: () => {} };
        });
        mockVscode.workspace.onDidSaveTextDocument = mockOnSave;
        
        extensionModule.activate(mockContext);
        
        expect(saveEventHandler).toBeDefined();
        expect(mockVscode.workspace.onDidSaveTextDocument).toHaveBeenCalled();

        // Create a temporary test file
        const testFilePath = path.join(__dirname, 'temp-test2.kt');
        const testContent = 'fun test( ){println("hello") ;}';
        fs.writeFileSync(testFilePath, testContent);
        
        try {
            const mockDocument = {
                languageId: 'kotlin',
                fileName: testFilePath,
                uri: mockVscode.Uri.file(testFilePath)
            };

            const saveHandlerPromise = saveEventHandler(mockDocument);
            await saveHandlerPromise;
            await new Promise(resolve => setTimeout(resolve, 500));

            expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith('$(sync~spin) Running ktlint...');
            expect(mockStatusBarMessage.dispose).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        } finally {
            // Clean up
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    }, 30000);

    test('Manual run command works via compiled extension', async () => {
        const isInstalled = await checkKtlintInstalled();
        if (!isInstalled) {
            console.log('ktlint not installed, skipping test');
            return;
        }

        extensionModule.activate(mockContext);

        const runAnalysisCommand = (global as any).mockCommands['ktlint.runAnalysis'];
        expect(runAnalysisCommand).toBeDefined();

        await runAnalysisCommand();
        await new Promise(resolve => setTimeout(resolve, 2000));

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Ktlint extension is now active');
        expect(mockDiagnosticCollection.clear).toHaveBeenCalled();
    }, 30000);

    afterAll(() => {
        if (extensionModule && extensionModule.deactivate) {
            extensionModule.deactivate();
        }
    });
});

// Helper functions
function checkKtlintInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        const process = spawn('which', ['ktlint']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
    });
}

function runKtlint(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const ktlintProcess = spawn('ktlint', [filePath]);
        
        let stdout = '';
        let stderr = '';

        ktlintProcess.stdout.on('data', (data: any) => {
            stdout += data.toString();
        });

        ktlintProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        ktlintProcess.on('close', () => {
            resolve(stdout + stderr);
        });

        ktlintProcess.on('error', (error: Error) => {
            reject(error);
        });
    });
}
