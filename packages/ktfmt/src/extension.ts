import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

let outputChannel: vscode.OutputChannel;
let runningProcess: ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('ktfmt');
    context.subscriptions.push(outputChannel);
    
    outputChannel.appendLine('ktfmt extension is now active');

    // Register command for formatting document
    const formatDocumentCommand = vscode.commands.registerCommand('ktfmt.formatDocument', async () => {
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

    // Register command for formatting workspace
    const formatWorkspaceCommand = vscode.commands.registerCommand('ktfmt.formatWorkspace', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        await formatWorkspace(workspaceFolder.uri.fsPath);
    });

    // Register on-save listener
    const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
        const config = vscode.workspace.getConfiguration('ktfmt');
        const enabled = config.get<boolean>('enable', true);
        const formatOnSave = config.get<boolean>('formatOnSave', false);

        if (!enabled || !formatOnSave) {
            return;
        }

        if (document.languageId === 'kotlin' && document.fileName.endsWith('.kt')) {
            await formatFile(document.fileName);
        }
    });

    context.subscriptions.push(formatDocumentCommand, formatWorkspaceCommand, onSaveListener);
}

async function formatFile(filePath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('ktfmt');
    const ktfmtPath = config.get<string>('executablePath', 'ktfmt');
    const extraArgs = config.get<string[]>('args', []);

    // Cancel any running process
    if (runningProcess) {
        outputChannel.appendLine('Cancelling previous ktfmt run...');
        runningProcess.kill();
        runningProcess = null;
    }

    const statusBarMessage = vscode.window.setStatusBarMessage('$(sync~spin) Running ktfmt...');
    
    outputChannel.appendLine(`Formatting file: ${filePath}`);

    try {
        // Build ktfmt arguments
        const args = [...extraArgs, filePath];
        
        outputChannel.appendLine(`Command: ${ktfmtPath} ${args.join(' ')}`);

        // Spawn ktfmt process
        const ktfmtProcess = spawn(ktfmtPath, args);
        
        runningProcess = ktfmtProcess;

        let stderr = '';

        ktfmtProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        await new Promise<void>((resolve, reject) => {
            ktfmtProcess.on('close', (code: number | null) => {
                runningProcess = null;
                outputChannel.appendLine(`ktfmt process exited with code: ${code}`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ktfmt exited with code ${code}\n${stderr}`));
                }
            });

            ktfmtProcess.on('error', (error: Error) => {
                runningProcess = null;
                outputChannel.appendLine(`ktfmt process error: ${error.message}`);
                reject(error);
            });
        });

        outputChannel.appendLine('File formatted successfully');
        vscode.window.showInformationMessage('ktfmt: File formatted successfully');

    } catch (error: any) {
        outputChannel.appendLine(`ktfmt error: ${error.message}`);
        vscode.window.showErrorMessage(`ktfmt error: ${error.message}`);
    } finally {
        runningProcess = null;
        statusBarMessage.dispose();
    }
}

async function formatWorkspace(workspacePath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('ktfmt');
    const ktfmtPath = config.get<string>('executablePath', 'ktfmt');
    const extraArgs = config.get<string[]>('args', []);

    // Cancel any running process
    if (runningProcess) {
        outputChannel.appendLine('Cancelling previous ktfmt run...');
        runningProcess.kill();
        runningProcess = null;
    }

    const statusBarMessage = vscode.window.setStatusBarMessage('$(sync~spin) Running ktfmt on workspace...');
    
    outputChannel.appendLine(`Formatting workspace: ${workspacePath}`);

    try {
        // Build ktfmt arguments for workspace
        const args = [...extraArgs, workspacePath];
        
        outputChannel.appendLine(`Command: ${ktfmtPath} ${args.join(' ')}`);

        // Spawn ktfmt process
        const ktfmtProcess = spawn(ktfmtPath, args, {
            cwd: workspacePath
        });
        
        runningProcess = ktfmtProcess;

        let stderr = '';

        ktfmtProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        await new Promise<void>((resolve, reject) => {
            ktfmtProcess.on('close', (code: number | null) => {
                runningProcess = null;
                outputChannel.appendLine(`ktfmt process exited with code: ${code}`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ktfmt exited with code ${code}\n${stderr}`));
                }
            });

            ktfmtProcess.on('error', (error: Error) => {
                runningProcess = null;
                outputChannel.appendLine(`ktfmt process error: ${error.message}`);
                reject(error);
            });
        });

        outputChannel.appendLine('Workspace formatted successfully');
        vscode.window.showInformationMessage('ktfmt: Workspace formatted successfully');

    } catch (error: any) {
        outputChannel.appendLine(`ktfmt error: ${error.message}`);
        vscode.window.showErrorMessage(`ktfmt error: ${error.message}`);
    } finally {
        runningProcess = null;
        statusBarMessage.dispose();
    }
}

export function deactivate() {
    // Cancel any running process
    if (runningProcess) {
        runningProcess.kill();
        runningProcess = null;
    }
    
    if (outputChannel) {
        outputChannel.dispose();
    }
}
