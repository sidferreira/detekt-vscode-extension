import * as path from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs';

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

    test('parseDetektOutput counts diagnostics using real detekt on good-example.kt (should be 0)', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            console.log('Skipping test: detekt not installed');
            return;
        }

        const fixturesPath = path.resolve(__dirname, './fixtures');
        const goodExamplePath = path.join(fixturesPath, 'good-example.kt');
        
        if (!fs.existsSync(goodExamplePath)) {
            throw new Error('Test fixture good-example.kt not found');
        }

        const detektOutput = await runDetekt(goodExamplePath);
        const diagnosticsMap = extensionModule.parseDetektOutput(detektOutput, fixturesPath);
        
        // Good example should have 0 diagnostics
        const totalDiagnostics = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);
        
        expect(totalDiagnostics).toBe(0);
    }, 30000);

    test('parseDetektOutput counts diagnostics using real detekt on single-issue.kt', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            console.log('Skipping test: detekt not installed');
            return;
        }

        const fixturesPath = path.resolve(__dirname, './fixtures');
        const singleIssuePath = path.join(fixturesPath, 'single-issue.kt');
        
        if (!fs.existsSync(singleIssuePath)) {
            throw new Error('Test fixture single-issue.kt not found');
        }

        const detektOutput = await runDetekt(singleIssuePath);
        const diagnosticsMap = extensionModule.parseDetektOutput(detektOutput, fixturesPath);
        
        expect(diagnosticsMap.size).toBeGreaterThan(0);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBeGreaterThan(0);
        
        // Count total diagnostics
        const totalDiagnostics = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);
        
        console.log(`single-issue.kt: Found ${totalDiagnostics} diagnostic(s)`);
        
        // Verify diagnostic properties
        const firstDiagnostic = diagnostics[0];
        expect(firstDiagnostic).toHaveProperty('message');
        expect(firstDiagnostic).toHaveProperty('code');
        expect(firstDiagnostic.source).toBe('detekt');
    }, 30000);

    test('parseDetektOutput counts multiple diagnostics using real detekt on multiple-issues.kt', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            console.log('Skipping test: detekt not installed');
            return;
        }

        const fixturesPath = path.resolve(__dirname, './fixtures');
        const multipleIssuesPath = path.join(fixturesPath, 'multiple-issues.kt');
        
        if (!fs.existsSync(multipleIssuesPath)) {
            throw new Error('Test fixture multiple-issues.kt not found');
        }

        const detektOutput = await runDetekt(multipleIssuesPath);
        const diagnosticsMap = extensionModule.parseDetektOutput(detektOutput, fixturesPath);
        
        expect(diagnosticsMap.size).toBe(1);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBeGreaterThan(1);
        
        // Count total diagnostics
        const totalDiagnostics = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);
        
        console.log(`multiple-issues.kt: Found ${totalDiagnostics} diagnostic(s)`);
    }, 30000);

    test('parseDetektOutput counts diagnostics using real detekt on bad-example.kt', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            console.log('Skipping test: detekt not installed');
            return;
        }

        const fixturesPath = path.resolve(__dirname, './fixtures');
        const badExamplePath = path.join(fixturesPath, 'bad-example.kt');
        
        if (!fs.existsSync(badExamplePath)) {
            throw new Error('Test fixture bad-example.kt not found');
        }

        const detektOutput = await runDetekt(badExamplePath);
        const diagnosticsMap = extensionModule.parseDetektOutput(detektOutput, fixturesPath);
        
        expect(diagnosticsMap.size).toBe(1);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        
        // Count total diagnostics
        const totalDiagnostics = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);
        
        console.log(`bad-example.kt: Found ${totalDiagnostics} diagnostic(s)`);
        
        // bad-example.kt should have multiple issues
        expect(diagnostics.length).toBeGreaterThan(0);
        
        // Verify diagnostic properties
        const firstDiagnostic = diagnostics[0];
        expect(firstDiagnostic).toHaveProperty('range');
        expect(firstDiagnostic).toHaveProperty('message');
        expect(firstDiagnostic).toHaveProperty('code');
        expect(firstDiagnostic.source).toBe('detekt');
    }, 30000);

    test('parseDetektOutput verifies diagnostic properties are set correctly', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            console.log('Skipping test: detekt not installed');
            return;
        }

        const fixturesPath = path.resolve(__dirname, './fixtures');
        const singleIssuePath = path.join(fixturesPath, 'single-issue.kt');
        
        if (!fs.existsSync(singleIssuePath)) {
            throw new Error('Test fixture single-issue.kt not found');
        }

        const detektOutput = await runDetekt(singleIssuePath);
        const diagnosticsMap = extensionModule.parseDetektOutput(detektOutput, fixturesPath);
        
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        expect(diagnostics.length).toBeGreaterThan(0);
        
        const diagnostic = diagnostics[0];
        expect(diagnostic.message).toBeTruthy();
        expect(diagnostic.code).toBeTruthy();
        expect(diagnostic.source).toBe('detekt');
        expect(diagnostic.range.start.line).toBeGreaterThanOrEqual(0);
        expect(diagnostic.range.start.character).toBeGreaterThanOrEqual(0);
    }, 30000);
});
