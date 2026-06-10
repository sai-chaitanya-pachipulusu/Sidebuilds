const fs = require('fs');
const path = require('path');

console.log('Setting up environment...');

const envFiles = [
  { src: path.join(__dirname, 'server', '.env.example'), dest: path.join(__dirname, 'server', '.env') },
  { src: path.join(__dirname, 'client', '.env.example'), dest: path.join(__dirname, 'client', '.env') },
];

envFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    console.log(`Created ${dest} from ${src}`);
  } else if (fs.existsSync(dest)) {
    console.log(`${dest} already exists, skipping.`);
  } else {
    console.log(`Warning: ${src} not found, skipping.`);
  }
});

console.log('Environment setup complete.');
