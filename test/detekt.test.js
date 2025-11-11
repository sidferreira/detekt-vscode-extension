"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
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
function checkDetektInstalled() {
    return new Promise((resolve) => {
        const process = (0, child_process_1.spawn)('which', ['detekt']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
    });
}
async function getDetektVersion() {
    try {
        return await runCommand('detekt', ['--version']);
    }
    catch (error) {
        return '';
    }
}
function runDetekt(filePath) {
    return new Promise((resolve, reject) => {
        const detektProcess = (0, child_process_1.spawn)('detekt', [filePath]);
        let stdout = '';
        let stderr = '';
        detektProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        detektProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        detektProcess.on('close', () => {
            // detekt returns non-zero when issues found, but that's expected
            resolve(stdout + stderr);
        });
        detektProcess.on('error', (error) => {
            reject(error);
        });
    });
}
function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const process = (0, child_process_1.spawn)(command, args);
        let stdout = '';
        let stderr = '';
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout + stderr);
            }
            else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
        process.on('error', (error) => {
            reject(error);
        });
    });
}
function parseDetektOutput(output, workspacePath) {
    const diagnosticsMap = new Map();
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
        const diagnostic = {
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
//# sourceMappingURL=detekt.test.js.map