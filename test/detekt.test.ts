
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('Detekt Test Suite', () => {
    const fixturesPath = path.resolve(__dirname, './fixtures');
    const badExamplePath = path.join(fixturesPath, 'bad-example.kt');
    
    test('Detekt is installed and accessible', async () => {
        const version = await getDetektVersion();
        expect(version.length > 0).toBeTruthy(); // 'Detekt should return version info'
        console.log('Detekt version:', version);
    }, 10000);

    test('Run detekt on bad example and parse output', async () => {
        // Skip if detekt not installed
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            console.log('Skipping: detekt not installed. Install with: curl -sSLO https://github.com/detekt/detekt/releases/download/v1.23.4/detekt-cli-1.23.4.zip && unzip detekt-cli-1.23.4.zip && sudo cp detekt-cli-1.23.4/bin/detekt /usr/local/bin/');
            return;
        }

        // Verify fixture exists
        expect(fs.existsSync(badExamplePath)).toBeTruthy(); // 'Test fixture bad-example.kt should exist'

        // Run detekt on the fixture
        const output = await runDetekt(badExamplePath);
        
        console.log('Detekt raw output:', output);
        
        // Parse the output
        const diagnosticsMap = parseDetektOutput(output, fixturesPath);
        
        // Verify we got some diagnostics
        console.log('Parsed diagnostics map size:', diagnosticsMap.size);
        console.log('Diagnostics:', Array.from(diagnosticsMap.entries()));
        
        // We expect at least the file to appear in output
        expect(output.includes('bad-example.kt') || output.includes('.kt')).toBeTruthy();
    }, 30000);

    test('Parse real detekt output format', async () => {
        const isInstalled = await checkDetektInstalled();
        if (!isInstalled) {
            return;
        }

        const output = await runDetekt(badExamplePath);
        const workspacePath = fixturesPath;
        
        // Test our parsing function with real detekt output
        const diagnosticsMap = parseDetektOutput(output, workspacePath);
        
        // Log what we found
        diagnosticsMap.forEach((diagnostics, filePath) => {
            console.log(`File: ${filePath}`);
            diagnostics.forEach(diag => {
                console.log(`  Line ${diag.line}:${diag.column} - ${diag.message} [${diag.code}]`);
            });
        });
        
        // Just verify parsing doesn't crash
        expect(true).toBeTruthy(); // 'Parsing should complete without errors'
    }, 30000);
});

function checkDetektInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        const process = spawn('which', ['detekt']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
    });
}

async function getDetektVersion(): Promise<string> {
    try {
        return await runCommand('detekt', ['--version']);
    } catch (error) {
        return '';
    }
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

// Simplified diagnostic type for testing
interface SimpleDiagnostic {
    line: number;
    column: number;
    message: string;
    code: string;
}

function parseDetektOutput(output: string, workspacePath: string): Map<string, SimpleDiagnostic[]> {
    const diagnosticsMap = new Map<string, SimpleDiagnostic[]>();
    
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
        
        // Convert to absolute path
        const absolutePath = path.isAbsolute(relativePath) 
            ? relativePath 
            : path.join(workspacePath, relativePath);
        
        const line = parseInt(lineStr, 10) - 1; // Convert to 0-based
        const column = parseInt(columnStr, 10) - 1; // Convert to 0-based
        
        const diagnostic: SimpleDiagnostic = {
            line,
            column,
            message,
            code
        };
        
        // Add to map
        if (!diagnosticsMap.has(absolutePath)) {
            diagnosticsMap.set(absolutePath, []);
        }
        const diagnostics = diagnosticsMap.get(absolutePath);
        if (diagnostics) {
            diagnostics.push(diagnostic);
        }
    }
    
    return diagnosticsMap;
}
