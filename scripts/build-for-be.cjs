const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const feRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(feRoot, '..');
const browserBuildPath = path.join(feRoot, 'dist', 'expense-tracker-fe', 'browser');
const bePublicPath = path.join(workspaceRoot, 'expense-tracker-be', 'public');
const buildCommand = process.platform === 'win32'
  ? { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'npm run build'] }
  : { command: 'npm', args: ['run', 'build'] };

const run = (command, args, cwd) => {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
  });
};

console.log('Building Angular browser bundle...');
run(buildCommand.command, buildCommand.args, feRoot);

const browserIndexPath = path.join(browserBuildPath, 'index.html');
const browserCsrIndexPath = path.join(browserBuildPath, 'index.csr.html');

if (!fs.existsSync(browserIndexPath) && !fs.existsSync(browserCsrIndexPath)) {
  throw new Error(`Angular browser index file not found at ${browserBuildPath}`);
}

console.log(`Copying FE build to BE public folder: ${bePublicPath}`);
fs.rmSync(bePublicPath, { recursive: true, force: true });
fs.mkdirSync(bePublicPath, { recursive: true });
fs.cpSync(browserBuildPath, bePublicPath, { recursive: true });

const copiedCsrIndexPath = path.join(bePublicPath, 'index.csr.html');
const copiedIndexPath = path.join(bePublicPath, 'index.html');
if (!fs.existsSync(copiedIndexPath) && fs.existsSync(copiedCsrIndexPath)) {
  fs.copyFileSync(copiedCsrIndexPath, copiedIndexPath);
}

console.log('FE build is ready to be served by the BE service.');
