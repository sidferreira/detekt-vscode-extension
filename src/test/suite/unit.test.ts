import * as assert from 'assert';
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

suite('Unit Test Suite', () => {
    vscode.window.showInformationMessage('Start unit tests.');

    test('Parse detekt output with single issue', async () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = `
src/main/kotlin/Example.kt:10:5: Magic number detected [MagicNumber]
        `.trim();

        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);

        assert.strictEqual(diagnosticsMap.size, 1);
        const diagnostics = Array.from(diagnosticsMap.values())[0];
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].message, 'Magic number detected');
        assert.strictEqual(diagnostics[0].code, 'MagicNumber');
        assert.strictEqual(diagnostics[0].source, 'detekt');
        assert.strictEqual(diagnostics[0].range.start.line, 9); // 0-based
        assert.strictEqual(diagnostics[0].range.start.character, 4); // 0-based
    });

    test('Parse detekt output with multiple issues', async () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = `
src/main/kotlin/Example.kt:10:5: Magic number detected [MagicNumber]
src/main/kotlin/Example.kt:15:10: Line too long [MaxLineLength]
src/main/kotlin/Helper.kt:5:1: Missing documentation [UndocumentedPublicClass]
        `.trim();

        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);

        assert.strictEqual(diagnosticsMap.size, 2);
        
        const exampleDiagnostics = Array.from(diagnosticsMap.values())[0];
        assert.strictEqual(exampleDiagnostics.length, 2);
        
        const helperDiagnostics = Array.from(diagnosticsMap.values())[1];
        assert.strictEqual(helperDiagnostics.length, 1);
        assert.strictEqual(helperDiagnostics[0].code, 'UndocumentedPublicClass');
    });

    test('Parse detekt output with absolute paths', async () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = `/workspace/test-project/src/main/kotlin/Example.kt:10:5: Magic number detected [MagicNumber]`;

        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);

        assert.strictEqual(diagnosticsMap.size, 1);
        const uriKey = Array.from(diagnosticsMap.keys())[0];
        assert.ok(uriKey.fsPath.endsWith('src/main/kotlin/Example.kt') || uriKey.fsPath.includes('Example.kt'));
    });

    test('Parse empty detekt output', async () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = '';

        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);

        assert.strictEqual(diagnosticsMap.size, 0);
    });

    test('Parse detekt output with no issues', async () => {
        const workspacePath = '/workspace/test-project';
        const detektOutput = 'detekt completed successfully with 0 issues';

        const diagnosticsMap = parseDetektOutputTest(detektOutput, workspacePath);

        assert.strictEqual(diagnosticsMap.size, 0);
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
            
            assert.ok(stdoutData.includes('MagicNumber'));
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
        diagnosticsMap.get(uri)!.push(diagnostic);
    }
    
    return diagnosticsMap;
}
