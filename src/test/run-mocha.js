const Mocha = require('mocha');
const path = require('path');
const glob = require('glob');

const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 60000
});

const testsRoot = path.resolve(__dirname, '../../out/test/suite');

// Add test files
const files = glob.sync('**/*.test.js', { cwd: testsRoot });
files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

// Run tests
mocha.run(failures => {
    if (failures > 0) {
        process.exit(1);
    }
});
