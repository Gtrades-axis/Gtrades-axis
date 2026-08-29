const fs = require("fs");
const path = require("path");

const map = {
  "index.html": "/",
  "dashboard": "/dashboard",
  "login": "/login",
  "register.html": "/register",
  "profile.html": "/profile",
  "history.html": "/history",
  "journal.html": "/journal",
  "analytics.html": "/analytics",
  "resources.html": "/resources",
  "admin": "/admin",
  "ai-review.html": "/ai-review",
  "certificate.html": "/certificate",
  "lesson.html": "/lesson",
  "quiz.html": "/quiz",
  "premium-academy.html": "/academy",
  "academy.html": "/academy-admin",
  "contact.html": "/contact",
  "support.html": "/support",
  "videos.html": "/videos",
  "pending": "/pending",
  "access-denied.html": "/access-denied",
  "upgrade.html": "/upgrade",
  "payment.html": "/payment",
  "membership.html": "/membership",
  "downloads.html": "/downloads",
  "forgot-password.html": "/forgot-password",
  "backtesting-lab": "/backtesting-lab",
  "premium-resources.html": "/premium-resources",
  "premium.html": "/premium",
  "strategy.html": "/strategy",
  "module.html": "/module",
  "student-performance.html": "/student-performance",
  "verify-email.html": "/verify-email",
  "admin-members.html": "/admin-members",
  "admin-payments.html": "/admin-payments",
  "admin-performance.html": "/admin-performance",
  "admin-video-upload.html": "/admin-video-upload",
  "admin-videos.html": "/admin-videos"
};

function walk(dir, callback) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!["node_modules", ".git", ".vscode", ".github"].includes(file)) walk(fullPath, callback);
    } else if (/\.(html|js)$/.test(file)) callback(fullPath);
  }
}

walk(".", (file) => {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  for (const [oldLink, newLink] of Object.entries(map)) {
    const escaped = oldLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content.replace(new RegExp(`((?:href|action|src)=["'])(?:\\.\\./|\\.\\/)?${escaped}(?=([?#][^"']*)?["'])`, "g"), `$1${newLink}`);
    content = content.replace(new RegExp(`((?:window\\.)?location\\.href\\s*=\\s*["'])(?:\\.\\./|\\.\\/)?${escaped}(?=([?#][^"']*)?["'])`, "g"), `$1${newLink}`);
  }
  if (content !== original) { fs.writeFileSync(file, content, "utf8"); console.log(`Updated: ${file}`); }
});
