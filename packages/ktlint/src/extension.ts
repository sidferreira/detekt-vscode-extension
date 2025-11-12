import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

let diagnosticCollection: vscode.DiagnosticCollection;
let outputChannel: vscode.OutputChannel;
let runningProcess: ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('ktlint');
    context.subscriptions.push(outputChannel);
    
    outputChannel.appendLine('ktlint extension is now active');

    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('ktlint');
    context.subscriptions.push(diagnosticCollection);

    // Register command for manual analysis
    const runAnalysisCommand = vscode.commands.registerCommand('ktlint.runAnalysis', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        await runKtlint(workspaceFolder.uri.fsPath);
    });

    // Register command for formatting document
    const formatDocumentCommand = vscode.commands.registerCommand('ktlint.formatDocument', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        if (editor.document.languageId !== 'kotlin') {
            vscode.window.showErrorMessage('Current file is not a Kotlin file');
            return;
        }
        
        await formatFile(editor.document.uri.fsPath);
    });

    // Register on-save listener
    const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
        const config = vscode.workspace.getConfiguration('ktlint');
        const enabled = config.get<boolean>('enable', true);
        const runOnSave = config.get<boolean>('runOnSave', true);
        const formatOnSave = config.get<boolean>('formatOnSave', false);

        if (!enabled) {
            return;
        }

        if (document.languageId === 'kotlin' && document.fileName.endsWith('.kt')) {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (workspaceFolder) {
                if (formatOnSave) {
                    await formatFile(document.fileName);
                } else if (runOnSave) {
                    await runKtlint(workspaceFolder.uri.fsPath, document.fileName);
                }
            }
        }
    });

    context.subscriptions.push(runAnalysisCommand, formatDocumentCommand, onSaveListener);
}

async function runKtlint(workspacePath: string, specificFile?: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('ktlint');
    const ktlintPath = config.get<string>('executablePath', 'ktlint');
    const extraArgs = config.get<string[]>('args', []);

    // Cancel any running process
    if (runningProcess) {
        outputChannel.appendLine('Cancelling previous ktlint run...');
        runningProcess.kill();
        runningProcess = null;
    }

    // Clear previous diagnostics
    if (specificFile) {
        diagnosticCollection.delete(vscode.Uri.file(specificFile));
    } else {
        diagnosticCollection.clear();
    }

    const statusBarMessage = vscode.window.setStatusBarMessage('$(sync~spin) Running ktlint...');
    
    const targetPath = specificFile || workspacePath;
    outputChannel.appendLine(`Running ktlint on: ${targetPath}`);

    try {
        // Build ktlint arguments
        const args = [...extraArgs, targetPath];
        
        outputChannel.appendLine(`Command: ${ktlintPath} ${args.join(' ')}`);

        // Spawn ktlint process
        const ktlintProcess = spawn(ktlintPath, args, {
            cwd: workspacePath
        });
        
        runningProcess = ktlintProcess;

        let stdout = '';
        let stderr = '';

        ktlintProcess.stdout.on('data', (data: any) => {
            stdout += data.toString();
        });

        ktlintProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        await new Promise<void>((resolve, reject) => {
            ktlintProcess.on('close', (code: number | null) => {
                runningProcess = null;
                outputChannel.appendLine(`ktlint process exited with code: ${code}`);
                // ktlint returns non-zero exit code when issues are found
                // We treat this as success and parse the output
                resolve();
            });

            ktlintProcess.on('error', (error: Error) => {
                runningProcess = null;
                outputChannel.appendLine(`ktlint process error: ${error.message}`);
                reject(error);
            });
        });

        // Parse ktlint output
        const output = stdout + stderr;
        const diagnosticsMap = parseKtlintOutput(output, workspacePath);

        // Apply diagnostics
        diagnosticsMap.forEach((diagnostics, uri) => {
            diagnosticCollection.set(uri, diagnostics);
        });

        const issueCount = Array.from(diagnosticsMap.values())
            .reduce((sum, diags) => sum + diags.length, 0);

        outputChannel.appendLine(`Found ${issueCount} issue(s)`);

        if (issueCount > 0) {
            vscode.window.showInformationMessage(`ktlint found ${issueCount} issue(s)`);
        } else {
            vscode.window.showInformationMessage('ktlint: No issues found');
        }

    } catch (error: any) {
        outputChannel.appendLine(`ktlint error: ${error.message}`);
        vscode.window.showErrorMessage(`ktlint error: ${error.message}`);
    } finally {
        runningProcess = null;
        statusBarMessage.dispose();
    }
}

async function formatFile(filePath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('ktlint');
    const ktlintPath = config.get<string>('executablePath', 'ktlint');
    const extraArgs = config.get<string[]>('args', []);

    // Cancel any running process
    if (runningProcess) {
        outputChannel.appendLine('Cancelling previous ktlint run...');
        runningProcess.kill();
        runningProcess = null;
    }

    const statusBarMessage = vscode.window.setStatusBarMessage('$(sync~spin) Running ktlint format...');
    
    outputChannel.appendLine(`Formatting file: ${filePath}`);

    try {
        // Build ktlint arguments with format flag
        const args = ['-F', ...extraArgs, filePath];
        
        outputChannel.appendLine(`Command: ${ktlintPath} ${args.join(' ')}`);

        // Spawn ktlint process
        const ktlintProcess = spawn(ktlintPath, args);
        
        runningProcess = ktlintProcess;

        let stderr = '';

        ktlintProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        await new Promise<void>((resolve, reject) => {
            ktlintProcess.on('close', (code: number | null) => {
                runningProcess = null;
                outputChannel.appendLine(`ktlint format process exited with code: ${code}`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ktlint format exited with code ${code}\n${stderr}`));
                }
            });

            ktlintProcess.on('error', (error: Error) => {
                runningProcess = null;
                outputChannel.appendLine(`ktlint format process error: ${error.message}`);
                reject(error);
            });
        });

        outputChannel.appendLine('File formatted successfully');
        vscode.window.showInformationMessage('ktlint: File formatted successfully');

    } catch (error: any) {
        outputChannel.appendLine(`ktlint format error: ${error.message}`);
        vscode.window.showErrorMessage(`ktlint format error: ${error.message}`);
    } finally {
        runningProcess = null;
        statusBarMessage.dispose();
    }
}

export function parseKtlintOutput(output: string, workspacePath: string): Map<vscode.Uri, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<vscode.Uri, vscode.Diagnostic[]>();
    
    // Pattern: file.kt:line:col: message (rule-id)
    const linePattern = /^(.+\.kt):(\d+):(\d+): ([^\(]+) \(([^\)]+)\)/gm;
    
    let match;
    while ((match = linePattern.exec(output)) !== null) {
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
        diagnostic.source = 'ktlint';
        
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
