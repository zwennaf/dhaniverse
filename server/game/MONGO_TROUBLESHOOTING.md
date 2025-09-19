# MongoDB Authentication Troubleshooting

If you see an authentication error like `bad auth : authentication failed` when the Deno server attempts to connect to MongoDB Atlas, follow these steps:

1. Verify the `MONGODB_URI` environment variable contains the correct username and password.

2. If your password contains special characters (for example `@`, `:`, `/`, `#`), those characters must be percent-encoded in the URI. For example, `@` becomes `%40`.

3. Use the helper to validate your `MONGODB_URI` and get an example encoded URI without making a network connection:

```bash
deno run --allow-env client/server/game/tools/check_mongo_uri.ts
```

4. The game server includes a one-time retry that will try reconnecting using a percent-encoded password if an authentication failure is detected. If that retry does not succeed, update `MONGODB_URI` manually to the encoded form and restart the server.

5. Other common causes:
   - IP Whitelist: Ensure your server IP (or 0.0.0.0/0 during debugging) is allowed in the Atlas Network Access list.
   - User Database/Role: Make sure the Atlas user has access to the `dhaniverse` database (or the one specified) and proper roles.

If you still have problems after following these steps, paste the masked output of the helper here (it will not show your raw password) and I can help further.
