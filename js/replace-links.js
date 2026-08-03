const fs = require('fs');
const path = require('path');

const mapping = {
  '/dashboard': '/dashboard',
  '/history': '/history',
  '/analytics': '/analytics',
  '/journal': '/journal',
  '/login': '/login',
  '/register': '/register',
  '/profile': '/profile',
  '/resources': '/resources',
  '/admin': '/admin',
  '/ai-review': '/ai-review',
  '/certificate': '/certificate',
  '/lesson': '/lesson',
  '/quiz': '/quiz',
  '/premium-academy': '/academy',
  '/': '/',
  '/contact': '/contact',
  '/support': '/support',
  '/videos': '/videos',
  '/pending': '/pending',
  '/access-denied': '/access-denied',
};

const dir = './';

function walk(dir, callback) {
  fs.readdir(dir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      fs.stat(fullPath, (err, stat) => {
        if (stat && stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git' && file !== '.vscode') {
            walk(fullPath, callback);
          }
        } else if (/\.(html|htm|js)$/.test(file)) {
          callback(fullPath);
        }
      });
    });
  });
}

walk(dir, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  Object.entries(mapping).forEach(([oldLink, newLink]) => {
    // 1. HTML href and action attributes (handles ./ and ../)
    const attrRegex = new RegExp(`(href|action)=["'](?:\.\.\/|\.\/)?${oldLink}["']`, 'g');
    content = content.replace(attrRegex, (match, attr) => {
      return `${attr}="${newLink}"`;
    });

    // 2. JavaScript string redirects (e.g., location.href = '/dashboard')
    const jsRegex = new RegExp(`location\\.href\\s*=\\s*["'](?:\.\.\/|\.\/)?${oldLink}["']`, 'g');
    content = content.replace(jsRegex, `location.href = "${newLink}"`);

    // 3. window.location.href = '/dashboard'
    const winRegex = new RegExp(`window\\.location\\.href\\s*=\\s*["'](?:\.\.\/|\.\/)?${oldLink}["']`, 'g');
    content = content.replace(winRegex, `window.location.href = "${newLink}"`);

    // 4. Assignments like url = '/dashboard'
    const assignRegex = new RegExp(`\\b(url|redirect|path)\\s*=\\s*["'](?:\.\.\/|\.\/)?${oldLink}["']`, 'g');
    content = content.replace(assignRegex, (match, varName) => {
      return `${varName} = "${newLink}"`;
    });

    // Check if any change was made
    if (content !== fs.readFileSync(file, 'utf8')) {
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
  }
});