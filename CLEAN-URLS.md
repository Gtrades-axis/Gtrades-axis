# GTRADES-AXIS Clean URLs

Firebase Hosting now uses `cleanUrls: true`. All HTML pages are served without `.html`, and Firebase 301-redirects old `.html` URLs to the clean versions.

Examples: `/upgrade`, `/dashboard`, `/login`, `/videos`, `/academy`.

`premium-academy.html` is `/academy`; `academy.html` is the admin academy page at `/academy-admin`.
