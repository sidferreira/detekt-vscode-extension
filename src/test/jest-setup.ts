import * as fs from 'fs';
import * as path from 'path';

// Ensure fixtures are copied before tests run
beforeAll(() => {
  const srcFixtures = path.resolve(__dirname, 'fixtures');
  const destFixtures = path.resolve(__dirname, '../../out/test/fixtures');
  
  // Create destination directory
  if (!fs.existsSync(destFixtures)) {
    fs.mkdirSync(destFixtures, { recursive: true });
  }
  
  // Copy fixture files
  if (fs.existsSync(srcFixtures)) {
    const files = fs.readdirSync(srcFixtures);
    files.forEach(file => {
      if (file.endsWith('.kt')) {
        fs.copyFileSync(
          path.join(srcFixtures, file),
          path.join(destFixtures, file)
        );
      }
    });
  }
});
