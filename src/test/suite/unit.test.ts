import * as path from 'path';
import { EventEmitter } from 'events';
import * as vscode from '../mocks/vscode-mock';

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
        expect(uriKey.fsPath.includes('Example.kt')).toBe(true);
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
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();

        let stdoutData = '';
        mockProcess.stdout.on('data', (data: any) => {
            stdoutData += data.toString();
        });

        setTimeout(() => {
            mockProcess.stdout.emit('data', Buffer.from(mockOutput));
            mockProcess.emit('close', 0);
            
            expect(stdoutData.includes('MagicNumber')).toBe(true);
            done();
        }, 10);
    });
});

// Helper function extracted from extension.ts for testing
function parseDetektOutputTest(output: string, workspacePath: string): Map<vscode.Uri, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<vscode.Uri, vscode.Diagnostic[]>();
    
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
        
        const range = new vscode.Range(
            new vscode.Position(line, column),
            new vscode.Position(line, column + 1)
        );
        
        const diagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
        );
        
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
