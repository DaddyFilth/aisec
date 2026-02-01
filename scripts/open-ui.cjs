const port = process.env.PORT || 5173;
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
  const { exec } = require('node:child_process');
  exec(`${command} ${url}`, (error) => {
    if (error) {
      console.log(`Open this URL in your browser: ${url}`);
    }
  });
}
