import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
    console.log('Detekt extension is now active');

    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('detekt');
    context.subscriptions.push(diagnosticCollection);

    // Register command for manual analysis
    const runAnalysisCommand = vscode.commands.registerCommand('detekt.runAnalysis', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        await runDetekt(workspaceFolder.uri.fsPath);
    });

    // Register on-save listener
    const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
        const config = vscode.workspace.getConfiguration('detekt');
        const enabled = config.get<boolean>('enable', true);
        const runOnSave = config.get<boolean>('runOnSave', true);

        if (!enabled || !runOnSave) {
            return;
        }

        if (document.languageId === 'kotlin' && document.fileName.endsWith('.kt')) {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (workspaceFolder) {
                await runDetekt(workspaceFolder.uri.fsPath, document.fileName);
            }
        }
    });

    context.subscriptions.push(runAnalysisCommand, onSaveListener);
}

async function runDetekt(workspacePath: string, specificFile?: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('detekt');
    const detektPath = config.get<string>('executablePath', 'detekt');

    // Clear previous diagnostics
    if (specificFile) {
        diagnosticCollection.delete(vscode.Uri.file(specificFile));
    } else {
        diagnosticCollection.clear();
    }

    const statusBarMessage = vscode.window.setStatusBarMessage('$(sync~spin) Running detekt...');

    try {
        // Build detekt command
        let command = `${detektPath} --input "${workspacePath}"`;
        
        // Add specific file if provided
        if (specificFile) {
            command = `${detektPath} --input "${specificFile}"`;
        }

        // Add plain output format for easier parsing
        command += ' --report txt';

        const { stdout, stderr } = await execAsync(command, {
            cwd: workspacePath,
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        // Parse detekt output
        const diagnosticsMap = parseDetektOutput(stdout + stderr, workspacePath);

        // Apply diagnostics
        diagnosticsMap.forEach((diagnostics, uri) => {
            diagnosticCollection.set(uri, diagnostics);
        });

        const issueCount = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);

        if (issueCount > 0) {
            vscode.window.showInformationMessage(`Detekt found ${issueCount} issue(s)`);
        } else {
            vscode.window.showInformationMessage('Detekt: No issues found');
        }

    } catch (error: any) {
        // detekt returns non-zero exit code when issues are found
        if (error.stdout || error.stderr) {
            const diagnosticsMap = parseDetektOutput(error.stdout + error.stderr, workspacePath);
            
            diagnosticsMap.forEach((diagnostics, uri) => {
                diagnosticCollection.set(uri, diagnostics);
            });

            const issueCount = Array.from(diagnosticsMap.values())
                .reduce((sum, diags) => sum + diags.length, 0);

            if (issueCount > 0) {
                vscode.window.showInformationMessage(`Detekt found ${issueCount} issue(s)`);
            }
        } else {
            vscode.window.showErrorMessage(`Detekt error: ${error.message}`);
            console.error('Detekt execution error:', error);
        }
    } finally {
        statusBarMessage.dispose();
    }
}

function parseDetektOutput(output: string, workspacePath: string): Map<vscode.Uri, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<vscode.Uri, vscode.Diagnostic[]>();
    
    // Pattern: file.kt:line:column: message [RuleId]
    const pattern = /^(.+\.kt):(\d+):(\d+):\s+(.+?)\s+\[(.+?)\]$/gm;
    
    let match;
    while ((match = pattern.exec(output)) !== null) {
        const [, filePath, lineStr, columnStr, message, code] = match;
        
        // Convert to absolute path if relative
        let absolutePath = filePath;
        if (!path.isAbsolute(filePath)) {
            absolutePath = path.join(workspacePath, filePath);
        }
        
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

export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }
}