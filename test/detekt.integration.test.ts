import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

// Keep the original spawn for test utilities

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

// Event emitter for simulating VS Code events
const saveEventEmitter = new EventEmitter();

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
            // Store command callback for testing
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

// Mock the vscode module
jest.mock('vscode', () => mockVscode, { virtual: true });

describe('Detekt Integration Test Suite', () => {
    let extensionModule: any;
    let mockContext: any;

    beforeAll(async () => {
        // Clear any previous mocks
        jest.clearAllMocks();

        // Create mock extension context
        mockContext = {
            subscriptions: []
        };

        // Import the compiled extension
        delete require.cache[require.resolve('../dist/extensions.js')];
        extensionModule = require('../dist/extensions.js');
    });

    beforeEach(() => {
        // Clear mock function calls between tests
        jest.clearAllMocks();
        mockDiagnosticCollection.set.mockClear();
        mockOutputChannel.appendLine.mockClear();
        (global as any).mockCommands = {};
        
        // Reload the extension module for clean state
        delete require.cache[require.resolve('../dist/extensions.js')];
        extensionModule = require('../dist/extensions.js');
    });

    test('Extension activates without errors', () => {
        expect(() => {
            extensionModule.activate(mockContext);
        }).not.toThrow();
        
        // Verify that the extension registered the necessary components
        expect(mockVscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('detekt');
        expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith('Detekt');
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Detekt extension is now active');
    });

    test('parseDetektOutput function parses real detekt output correctly', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            return;
        }

        // Activate extension first
        extensionModule.activate(mockContext);

        // Run detekt on our test fixture to get real output
        const fixturesPath = path.resolve(__dirname, './fixtures');
        const badExamplePath = path.join(fixturesPath, 'bad-example.kt');
        
        if (!fs.existsSync(badExamplePath)) {
            throw new Error('Test fixture bad-example.kt not found');
        }

        const detektOutput = await runDetekt(badExamplePath);
        
        // Use the compiled extension's parseDetektOutput function
        const diagnosticsMap = extensionModule.parseDetektOutput(detektOutput, fixturesPath);
        
        // Verify the parsing worked correctly
        expect(diagnosticsMap).toBeInstanceOf(Map);
        expect(diagnosticsMap.size).toBeGreaterThan(0);
        
        // Check that diagnostics were created properly
        const diagnostics = Array.from(diagnosticsMap.values())[0] as any[];
        expect(Array.isArray(diagnostics)).toBe(true);
        expect(diagnostics.length).toBeGreaterThan(0);
        
        // Verify diagnostic structure
        const firstDiagnostic = diagnostics[0];
        expect(firstDiagnostic).toHaveProperty('range');
        expect(firstDiagnostic).toHaveProperty('message');
        expect(firstDiagnostic).toHaveProperty('code');
        expect(firstDiagnostic.source).toBe('detekt');
    }, 30000);

    test('Save event triggers real detekt analysis via compiled extension', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            return;
        }

        // Clear any previous calls
        jest.clearAllMocks();
        mockDiagnosticCollection.set.mockClear();
        mockDiagnosticCollection.delete.mockClear();
        mockOutputChannel.appendLine.mockClear();
        
        // Store the save event handler that will be registered
        let saveEventHandler: any = null;
        
        // Mock the onDidSaveTextDocument to capture the handler
        const mockOnSave = jest.fn((callback) => {
            saveEventHandler = callback;
            return { dispose: () => {} };
        });
        mockVscode.workspace.onDidSaveTextDocument = mockOnSave;
        
        // Activate extension (this will register the save handler)
        extensionModule.activate(mockContext);
        
        // Verify the handler was registered
        expect(saveEventHandler).toBeDefined();
        expect(mockVscode.workspace.onDidSaveTextDocument).toHaveBeenCalled();

        // Create a mock document for a Kotlin file that actually exists
        const fixturesPath = path.resolve(__dirname, 'fixtures');
        const kotlinFilePath = path.join(fixturesPath, 'bad-example.kt');
        
        // Verify the fixture file exists
        expect(fs.existsSync(kotlinFilePath)).toBe(true);
        
        const mockDocument = {
            languageId: 'kotlin',
            fileName: kotlinFilePath,
            uri: mockVscode.Uri.file(kotlinFilePath)
        };

        // Call the save handler directly with the mock document
        // This will trigger the real detekt execution inside the extension
        const saveHandlerPromise = saveEventHandler(mockDocument);

        // Wait for the save handler to complete (which includes detekt subprocess execution)
        await saveHandlerPromise;

        // Give a small delay to ensure all mock calls are recorded
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify that detekt analysis was triggered and diagnostics were set
        expect(mockDiagnosticCollection.set).toHaveBeenCalled();
        
        // Get the diagnostics that were set
        const setCalls = mockDiagnosticCollection.set.mock.calls;
        expect(setCalls.length).toBeGreaterThan(0);
        
        const [uri, diagnostics] = setCalls[0];
        expect(uri).toBeDefined();
        expect(uri.fsPath).toBe(kotlinFilePath);
        expect(Array.isArray(diagnostics)).toBe(true);
        expect(diagnostics.length).toBeGreaterThan(0);
        
        // Verify diagnostic structure from real detekt output
        const firstDiagnostic = diagnostics[0];
        expect(firstDiagnostic).toHaveProperty('range');
        expect(firstDiagnostic).toHaveProperty('message');
        expect(firstDiagnostic).toHaveProperty('code');
        expect(firstDiagnostic.source).toBe('detekt');
        
        // Verify that the output channel was used
        expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        
        // Check that the status bar message was created and disposed
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith('$(sync~spin) Running detekt...');
        expect(mockStatusBarMessage.dispose).toHaveBeenCalled();
    }, 30000);

    test('Manual run command works via compiled extension', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            return;
        }

        // Activate extension
        extensionModule.activate(mockContext);

        // Get the registered command
        const runAnalysisCommand = (global as any).mockCommands['detekt.runAnalysis'];
        expect(runAnalysisCommand).toBeDefined();

        // Execute the command
        await runAnalysisCommand();

        // Give some time for async operations
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify that the analysis ran
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Detekt extension is now active');
        expect(mockDiagnosticCollection.clear).toHaveBeenCalled();
    }, 30000);

    afterAll(() => {
        // Deactivate extension
        if (extensionModule && extensionModule.deactivate) {
            extensionModule.deactivate();
        }
    });
});

// Helper functions
function checkDetektInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        const process = spawn('which', ['detekt']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
    });
}

function runDetekt(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const detektProcess = spawn('detekt', ['--input', filePath]);
        
        let stdout = '';
        let stderr = '';

        detektProcess.stdout.on('data', (data: any) => {
            stdout += data.toString();
        });

        detektProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        detektProcess.on('close', () => {
            // detekt returns non-zero when issues found, but that's expected
            resolve(stdout + stderr);
        });

        detektProcess.on('error', (error: Error) => {
            reject(error);
        });
    });
}