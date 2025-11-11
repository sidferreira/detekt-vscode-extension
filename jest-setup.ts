import * as fs from 'fs';
import * as path from 'path';

// Ensure fixtures are copied before tests run
beforeAll(() => {
  const sourceFixtures = path.resolve(__dirname, './test/fixtures');
  const destFixtures = path.resolve(__dirname, './dist/test/fixtures');
  
  // Create destination directory
  if (!fs.existsSync(destFixtures)) {
    fs.mkdirSync(destFixtures, { recursive: true });
  }
  
  // Copy fixture files
  if (fs.existsSync(sourceFixtures)) {
    const files = fs.readdirSync(sourceFixtures);
    files.forEach(file => {
      if (file.endsWith('.kt')) {
        fs.copyFileSync(
          path.join(sourceFixtures, file),
          path.join(destFixtures, file)
        );
      }
    });
  }
});
