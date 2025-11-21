import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { readFileSync } from 'fs';

interface ExtensionConfig {
    displayName: string;
    outputChannelName: string;
    configurationPrefix: string;
    commandId?: string;
    commandIds?: string[];
}

let diagnosticCollection: vscode.DiagnosticCollection;
let outputChannel: vscode.OutputChannel;
let runningProcess: ChildProcess | null = null;

function loadExtensionConfig(): ExtensionConfig {
    const configPath = path.join(__dirname, '..', 'extension.config.json');
    return JSON.parse(readFileSync(configPath, 'utf-8'));
}

export function activate(context: vscode.ExtensionContext) {
    const config = loadExtensionConfig();
    outputChannel = vscode.window.createOutputChannel(config.outputChannelName);
    context.subscriptions.push(outputChannel);
    
    outputChannel.appendLine(`${config.displayName} is now active`);

    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection(config.configurationPrefix);
    context.subscriptions.push(diagnosticCollection);

    // Register command for manual analysis
    const runAnalysisCommand = vscode.commands.registerCommand(config.commandId || 'detekt.runAnalysis', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        await runDetekt(workspaceFolder.uri.fsPath);
    });

    // Register on-save listener
    const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
        const wsConfig = vscode.workspace.getConfiguration(config.configurationPrefix);
        const enabled = wsConfig.get<boolean>('enable', true);
        const runOnSave = wsConfig.get<boolean>('runOnSave', true);

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
    const config = loadExtensionConfig();
    const wsConfig = vscode.workspace.getConfiguration(config.configurationPrefix);
    const detektPath = wsConfig.get<string>('executablePath', 'detekt');
    const extraArgs = wsConfig.get<string[]>('args', []);

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
        // Build detekt arguments: use --input flag to specify the path
        const args = ['--input', targetPath, ...extraArgs];
        
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

export function parseDetektOutput(output: string, workspacePath: string): Map<vscode.Uri, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<vscode.Uri, vscode.Diagnostic[]>();
    
    // Pattern: file.kt:line:column: message [RuleId]
    // Split by lines that start with file path to handle wrapped messages
    const linePattern = /^(.+\.kt):(\d+):(\d+): ([^[]+) \[([^\]]+)\]/gm;
    
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