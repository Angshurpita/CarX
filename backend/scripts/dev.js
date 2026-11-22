const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const venvPython = path.join(rootDir, '.venv', 'bin', 'python');
const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';

console.log('🚗 Starting CarX Full-Stack Monorepo (FastAPI + Next.js)...');

// 1. Start FastAPI Backend on port 8000
const backend = spawn(pythonCmd, ['-m', 'uvicorn', 'backend.main:app', '--reload', '--port', '8000'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PYTHONPATH: rootDir },
});

// 2. Start Next.js Frontend on port 3000
const frontend = spawn('npm', ['run', 'dev', '--prefix', 'frontend'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, BACKEND_URL: 'http://127.0.0.1:8000' },
});

function cleanup() {
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
