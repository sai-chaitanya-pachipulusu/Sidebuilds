## Learned User Preferences
- Use restrained, deliberate UI design with solid colors. Do not add gradients, glowing decoration or generic AI styling.
- Do not modify `.env` files unless the user explicitly confirms.
- Prefer semicolons over `&&` when giving or running chained commands for this Windows/PowerShell workspace.

## Learned Workspace Facts
- SideProject Tracker is the local SideBuilds marketplace app, with a React client and Node/Express server.
- Production database work targets Supabase PostgreSQL; SQLite is a development fallback path.
- Marketplace and dashboard statistics should always be dynamic from live APIs or the database, never hard-coded.
