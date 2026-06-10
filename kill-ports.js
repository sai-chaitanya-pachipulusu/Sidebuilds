const { execSync } = require('child_process');

const ports = [5002, 3002, 3001, 3000];

console.log('Killing processes on ports:', ports.join(', '));

ports.forEach(port => {
  try {
    const pid = execSync(
      `netstat -ano | findstr "LISTENING" | findstr ":${port} "`,
      { shell: true, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim().split(/\s+/).pop();

    if (pid) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore', shell: true });
      console.log(`Killed process on port ${port} (PID: ${pid})`);
    }
  } catch (e) {
    // Port not in use or no process found -- that's fine
  }
});

console.log('Port cleanup complete.');
