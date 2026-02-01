const port = process.env.PORT || 3000;
const url = process.env.UI_URL || `http://localhost:${port}`;

const commandByPlatform = {
  darwin: 'open',
  win32: 'start',
  linux: 'xdg-open'
};

const command = commandByPlatform[process.platform];

if (!command) {
  console.log(`Open this URL in your browser: ${url}`);
} else {
  const { execFile } = require('node:child_process');
  execFile(command, [url], (error) => {
    if (error) {
      console.log(`Open this URL in your browser: ${url}`);
    }
  });
}
