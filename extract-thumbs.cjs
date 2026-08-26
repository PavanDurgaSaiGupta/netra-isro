const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const thumbsDir = path.resolve('../shots/thumbs');
if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

const files = fs.readdirSync(path.resolve('../assets')).filter(f => f.endsWith('.mp4'));
files.forEach(f => {
  const input = path.resolve('../assets', f);
  const out = path.join(thumbsDir, f.replace('.mp4', '.jpg'));
  try {
    execSync(`ffmpeg -y -ss 00:00:01 -i "${input}" -vframes 1 -q:v 2 "${out}"`, { stdio: 'ignore' });
    console.log('Thumbnail created for', f);
  } catch (e) {
    console.error('Error extracting frame from', f, e.message);
  }
});
