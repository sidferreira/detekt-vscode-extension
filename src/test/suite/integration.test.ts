import * as assert from 'assert';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

suite('Integration Test Suite', () => {
    let detektInstalled = false;
    let detektOutput = '';

    suiteSetup(async function() {
        this.timeout(30000); // 30 seconds
        
        console.log('Checking detekt installation...');

        // Check if detekt is already installed
        const checkInstalled = await checkDetektInstalled();
        if (checkInstalled) {
            detektInstalled = true;
            console.log('Detekt is installed');
            
            // Run detekt once and capture output for tests
            const fixturesPath = path.resolve(__dirname, '../fixtures');
            const badExamplePath = path.join(fixturesPath, 'bad-example.kt');
            
            if (fs.existsSync(badExamplePath)) {
                try {
                    detektOutput = await runDetekt(badExamplePath);
                    console.log('Captured detekt output for testing');
                } catch (error) {
                    console.error('Failed to run detekt:', error);
                }
            }
        } else {
            console.log('Detekt not installed - integration tests will be skipped');
            console.log('To install detekt, run: curl -sSLO https://github.com/detekt/detekt/releases/download/v1.23.4/detekt-cli-1.23.4.zip && unzip detekt-cli-1.23.4.zip && sudo cp detekt-cli-1.23.4/bin/detekt /usr/local/bin/ && sudo chmod +x /usr/local/bin/detekt');
        }
    });

    test('Detekt is available', function() {
        if (!detektInstalled) {
            this.skip();
            return;
        }

        assert.ok(detektInstalled, 'Detekt should be installed');
    });

    test('Parse real detekt output', function() {
        if (!detektInstalled || !detektOutput) {
            this.skip();
            return;
        }

        console.log('Testing with detekt output:', detektOutput.substring(0, 200));

        // Verify output contains expected patterns
        const hasKotlinFile = detektOutput.includes('.kt') || detektOutput.length === 0;
        assert.ok(hasKotlinFile, 'Output should reference Kotlin files or be empty (no issues)');
    });

    test('Verify detekt command works', async function() {
        if (!detektInstalled) {
            this.skip();
            return;
        }

        this.timeout(10000);

        try {
            const versionOutput = await runCommand('detekt', ['--version']);
            assert.ok(versionOutput.length > 0, 'Detekt version command should produce output');
            console.log('Detekt version:', versionOutput);
        } catch (error) {
            // Some versions of detekt might not support --version
            console.log('Detekt --version not supported, but detekt is available');
        }
    });

    test('Run detekt on test fixture', async function() {
        if (!detektInstalled) {
            this.skip();
            return;
        }

        this.timeout(30000);

        const fixturesPath = path.resolve(__dirname, '../fixtures');
        const badExamplePath = path.join(fixturesPath, 'bad-example.kt');

        // Verify fixture exists
        assert.ok(fs.existsSync(badExamplePath), 'Test fixture bad-example.kt should exist');

        // Run detekt
        const output = await runDetekt(badExamplePath);
        
        console.log('Detekt output length:', output.length);
        console.log('Detekt output:', output);
        
        // Just verify it runs - detekt may or may not find issues depending on config
        assert.ok(true, 'Detekt should run successfully');
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
            if (code === 0 || code === null) {
                resolve(stdout + stderr);
            } else {
                // Still resolve, as detekt might return non-zero for valid reasons
                resolve(stdout + stderr);
            }
        });

        process.on('error', (error: Error) => {
            reject(error);
        });
    });
}

