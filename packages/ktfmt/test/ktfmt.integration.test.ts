import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

// Create comprehensive VS Code mocks for integration testing
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
        name: 'ktfmt-vscode-extension',
        index: 0
    }
];

const mockConfiguration = {
    get: jest.fn((key: string, defaultValue?: any) => {
        switch (key) {
            case 'enable': return true;
            case 'formatOnSave': return true;
            case 'executablePath': return 'ktfmt';
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
    }
};

jest.mock('vscode', () => mockVscode, { virtual: true });

describe('ktfmt Integration Test Suite', () => {
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
        mockOutputChannel.appendLine.mockClear();
        (global as any).mockCommands = {};
        
        delete require.cache[require.resolve('../dist/extension.js')];
        extensionModule = require('../dist/extension.js');
    });

    test('Extension activates without errors', () => {
        expect(() => {
            extensionModule.activate(mockContext);
        }).not.toThrow();
        
        expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith('ktfmt');
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('ktfmt extension is now active');
    });

    test('Save event triggers real ktfmt formatting via compiled extension', async () => {
        const isInstalled = await checkKtfmtInstalled();
        if (!isInstalled) {
            console.log('ktfmt not installed, skipping test');
            return;
        }

        jest.clearAllMocks();
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
        const testFilePath = path.join(__dirname, 'temp-test.kt');
        const testContent = 'fun test(){println("hello")}';
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

            expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith('$(sync~spin) Running ktfmt...');
            expect(mockStatusBarMessage.dispose).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
        } finally {
            // Clean up
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        }
    }, 30000);

    test('Manual format document command works via compiled extension', async () => {
        const isInstalled = await checkKtfmtInstalled();
        if (!isInstalled) {
            console.log('ktfmt not installed, skipping test');
            return;
        }

        // Create a temporary test file
        const testFilePath = path.join(__dirname, 'temp-test2.kt');
        const testContent = 'fun test(){println("hello")}';
        fs.writeFileSync(testFilePath, testContent);

        try {
            mockVscode.window.activeTextEditor = {
                document: {
                    languageId: 'kotlin',
                    uri: mockVscode.Uri.file(testFilePath)
                }
            };

            extensionModule.activate(mockContext);

            const formatDocumentCommand = (global as any).mockCommands['ktfmt.formatDocument'];
            expect(formatDocumentCommand).toBeDefined();

            await formatDocumentCommand();
            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('ktfmt extension is now active');
        } finally {
            // Clean up
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
            mockVscode.window.activeTextEditor = undefined;
        }
    }, 30000);

    afterAll(() => {
        if (extensionModule && extensionModule.deactivate) {
            extensionModule.deactivate();
        }
    });
});

// Helper function
function checkKtfmtInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        const process = spawn('which', ['ktfmt']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
    });
}
