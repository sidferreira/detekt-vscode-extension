import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

let diagnosticCollection: vscode.DiagnosticCollection;
let outputChannel: vscode.OutputChannel;
let runningProcess: ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Detekt');
    context.subscriptions.push(outputChannel);
    
    outputChannel.appendLine('Detekt extension is now active');

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
    const extraArgs = config.get<string[]>('args', []);

    // Cancel any running process
    if (runningProcess) {
        outputChannel.appendLine('Cancelling previous detekt run...');
        runningProcess.kill();
        runningProcess = null;
    }

    // Clear previous diagnostics
    if (specificFile) {
        diagnosticCollection.delete(vscode.Uri.file(specificFile));
    } else {
        diagnosticCollection.clear();
    }

    const statusBarMessage = vscode.window.setStatusBarMessage('$(sync~spin) Running detekt...');
    
    const targetPath = specificFile || workspacePath;
    outputChannel.appendLine(`Running detekt on: ${targetPath}`);

    try {
        // Build detekt arguments: just pass the path (file or project root)
        const args = [targetPath, ...extraArgs];
        
        outputChannel.appendLine(`Command: ${detektPath} ${args.join(' ')}`);

        // Spawn detekt process
        const detektProcess = spawn(detektPath, args, {
            cwd: workspacePath
        });
        
        runningProcess = detektProcess;

        let stdout = '';
        let stderr = '';

        detektProcess.stdout.on('data', (data: any) => {
            stdout += data.toString();
        });

        detektProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        await new Promise<void>((resolve, reject) => {
            detektProcess.on('close', (code: number | null) => {
                runningProcess = null;
                outputChannel.appendLine(`Detekt process exited with code: ${code}`);
                // detekt returns non-zero exit code when issues are found
                // We treat this as success and parse the output
                resolve();
            });

            detektProcess.on('error', (error: Error) => {
                runningProcess = null;
                outputChannel.appendLine(`Detekt process error: ${error.message}`);
                reject(error);
            });
        });

        // Parse detekt output
        const output = stdout + stderr;
        const diagnosticsMap = parseDetektOutput(output, workspacePath);

        // Apply diagnostics
        diagnosticsMap.forEach((diagnostics, uri) => {
            diagnosticCollection.set(uri, diagnostics);
        });

        const issueCount = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);

        outputChannel.appendLine(`Found ${issueCount} issue(s)`);

        if (issueCount > 0) {
            vscode.window.showInformationMessage(`Detekt found ${issueCount} issue(s)`);
        } else {
            vscode.window.showInformationMessage('Detekt: No issues found');
        }

    } catch (error: any) {
        outputChannel.appendLine(`Detekt error: ${error.message}`);
        vscode.window.showErrorMessage(`Detekt error: ${error.message}`);
    } finally {
        runningProcess = null;
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

export function deactivate() {
    // Cancel any running process
    if (runningProcess) {
        runningProcess.kill();
        runningProcess = null;
    }
    
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }
    
    if (outputChannel) {
        outputChannel.dispose();
    }
}