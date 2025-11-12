import { EventEmitter } from 'events';

// Create comprehensive VS Code mocks for integration testing
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
            case 'formatOnSave': return false;
            case 'executablePath': return 'ktfmt';
            case 'args': return [];
            default: return defaultValue;
        }
    })
};

const mockVscode = {
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
        onDidSaveTextDocument: jest.fn()
    },
    commands: {
        registerCommand: jest.fn()
    },
    Uri: {
        file: jest.fn((path: string) => ({ fsPath: path }))
    }
};

jest.mock('vscode', () => mockVscode, { virtual: true });

describe('ktfmt Integration Test Suite', () => {
    let extension: any;

    beforeEach(() => {
        jest.clearAllMocks();
        extension = require('../src/extension');
    });

    test('Extension activates without errors', () => {
        const mockContext = {
            subscriptions: []
        };

        expect(() => {
            extension.activate(mockContext);
        }).not.toThrow();

        expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith('ktfmt');
        expect(mockVscode.commands.registerCommand).toHaveBeenCalledWith(
            'ktfmt.formatDocument',
            expect.any(Function)
        );
        expect(mockVscode.commands.registerCommand).toHaveBeenCalledWith(
            'ktfmt.formatWorkspace',
            expect.any(Function)
        );
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
