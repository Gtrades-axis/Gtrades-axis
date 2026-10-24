# GTRADES-AXIS™ Admin Resource Upload Rebuild

## Flow
Admin Dashboard → Resources tab → Resource Upload Studio → Cloudflare R2 → Firestore `/resources` metadata → member resource pages.

## Premium Resources
`premium-resources.html` is no longer hard-coded. It reads `/resources`, filters published Premium items, and downloads the file from the Cloudflare R2 key stored in Firestore.

## Admin editing
The Admin Resources table can edit title, description, category, resource type, Premium/Free status, and Published/Draft status.

## R2 delete behavior
Deleting a resource from the Admin Dashboard removes its Firestore metadata only. The existing Cloudflare Worker intentionally keeps the R2 object.
