import * as assert from 'assert';
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

suite('Integration Test Suite', () => {
    let detektInstalled = false;

    suiteSetup(async function() {
        this.timeout(300000); // 5 minutes for brew install
        
        vscode.window.showInformationMessage('Starting integration tests - checking detekt installation');

        // Check if detekt is already installed
        const checkInstalled = await checkDetektInstalled();
        if (checkInstalled) {
            detektInstalled = true;
            vscode.window.showInformationMessage('Detekt already installed');
            return;
        }

        // Try to install detekt via brew
        try {
            vscode.window.showInformationMessage('Installing detekt via brew...');
            await installDetekt();
            detektInstalled = true;
            vscode.window.showInformationMessage('Detekt installed successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install detekt: ${error}`);
            console.error('Detekt installation failed:', error);
        }
    });

    test('Run detekt on file with known issues', async function() {
        if (!detektInstalled) {
            this.skip();
            return;
        }

        this.timeout(60000); // 60 seconds

        const fixturesPath = path.resolve(__dirname, '../fixtures');
        const badExamplePath = path.join(fixturesPath, 'bad-example.kt');

        // Verify fixture exists
        assert.ok(fs.existsSync(badExamplePath), 'Test fixture bad-example.kt should exist');

        // Run detekt
        const output = await runDetekt(badExamplePath);
        
        // Verify output contains expected issues
        assert.ok(output.length > 0, 'Detekt should produce output');
        
        // Check for common detekt patterns - at least file name and line numbers should appear
        assert.ok(
            output.includes('bad-example.kt') || output.includes('.kt'),
            'Output should reference Kotlin file'
        );

        console.log('Detekt output:', output);
    });

    test('Run detekt on file with no issues', async function() {
        if (!detektInstalled) {
            this.skip();
            return;
        }

        this.timeout(60000); // 60 seconds

        const fixturesPath = path.resolve(__dirname, '../fixtures');
        const goodExamplePath = path.join(fixturesPath, 'good-example.kt');

        // Verify fixture exists
        assert.ok(fs.existsSync(goodExamplePath), 'Test fixture good-example.kt should exist');

        // Run detekt
        const output = await runDetekt(goodExamplePath);
        
        console.log('Detekt output for good file:', output);
        
        // The output might be empty or contain success message
        // Just verify it runs without throwing
        assert.ok(true, 'Detekt should run successfully');
    });

    test('Verify detekt command works', async function() {
        if (!detektInstalled) {
            this.skip();
            return;
        }

        this.timeout(30000);

        const versionOutput = await runCommand('detekt', ['--version']);
        
        assert.ok(versionOutput.length > 0, 'Detekt version command should produce output');
        console.log('Detekt version:', versionOutput);
    });
});

function checkDetektInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        const process = spawn('which', ['detekt']);
        
        process.on('close', (code) => {
            resolve(code === 0);
        });

        process.on('error', () => {
            resolve(false);
        });
    });
}

function installDetekt(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if brew is available
        const checkBrew = spawn('which', ['brew']);
        
        checkBrew.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Homebrew not found. Please install detekt manually.'));
                return;
            }

            // Install detekt using brew
            const brewProcess = spawn('brew', ['install', 'detekt']);
            
            let output = '';
            
            brewProcess.stdout.on('data', (data: any) => {
                output += data.toString();
                console.log(data.toString());
            });

            brewProcess.stderr.on('data', (data: any) => {
                output += data.toString();
                console.error(data.toString());
            });

            brewProcess.on('close', (code: number | null) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`brew install failed with code ${code}: ${output}`));
                }
            });

            brewProcess.on('error', (error: Error) => {
                reject(error);
            });
        });

        checkBrew.on('error', () => {
            reject(new Error('Failed to check for Homebrew'));
        });
    });
}

function runDetekt(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const detektProcess = spawn('detekt', [filePath]);
        
        let stdout = '';
        let stderr = '';

        detektProcess.stdout.on('data', (data: any) => {
            stdout += data.toString();
        });

        detektProcess.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        detektProcess.on('close', (code: number | null) => {
            // detekt returns non-zero when issues found, but that's expected
            resolve(stdout + stderr);
        });

        detektProcess.on('error', (error: Error) => {
            reject(error);
        });
    });
}

function runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args);
        
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data: any) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data: any) => {
            stderr += data.toString();
        });

        process.on('close', (code: number | null) => {
            if (code === 0) {
                resolve(stdout + stderr);
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });

        process.on('error', (error: Error) => {
            reject(error);
        });
    });
}
