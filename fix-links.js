const fs = require('fs');
const path = require('path');

const map = {
  'index.html': '/',
  'dashboard.html': '/dashboard',
  'login.html': '/login',
  'register.html': '/register',
  'profile.html': '/profile',
  'history.html': '/history',
  'journal.html': '/journal',
  'analytics.html': '/analytics',
  'resources.html': '/resources',
  'admin.html': '/admin',
  'ai-review.html': '/ai-review',
  'certificate.html': '/certificate',
  'lesson.html': '/lesson',
  'quiz.html': '/quiz',
  'premium-academy.html': '/academy',
  'contact.html': '/contact',
  'support.html': '/support',
  'videos.html': '/videos',
  'pending.html': '/pending',
  'access-denied.html': '/access-denied',
  // add any other .html files you have
};

const dir = './';

function walk(dir, callback) {
  fs.readdir(dir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      fs.stat(fullPath, (err, stat) => {
        if (stat && stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git' && file !== '.vscode' && file !== '.github') {
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

  Object.entries(map).forEach(([oldLink, newLink]) => {
    // Replace in HTML attributes (href, action, src)
    const attrRegex = new RegExp(`(href|action|src)=["'](?:\.\.\/|\.\/)?${oldLink}["']`, 'g');
    if (attrRegex.test(content)) {
      content = content.replace(attrRegex, (match, attr) => `${attr}="${newLink}"`);
      changed = true;
    }

    // Replace in JavaScript redirects
    const jsRegex = new RegExp(`(location\\.href|window\\.location\\.href)\\s*=\\s*["'](?:\.\.\/|\.\/)?${oldLink}["']`, 'g');
    if (jsRegex.test(content)) {
      content = content.replace(jsRegex, (match, func) => `${func} = "${newLink}"`);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
  }
});