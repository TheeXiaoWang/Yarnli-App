const { execSync } = require('child_process');
const path = require('path');

console.log('Starting build process...');

try {
  // Set proper permissions and run vite build
  const buildCommand = process.platform === 'win32' 
    ? 'npx vite build' 
    : 'npx vite build';
  
  console.log('Running build command:', buildCommand);
  execSync(buildCommand, { 
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
