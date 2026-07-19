# Home server launch checklist

Before real users connect:

- Change the generated root `.env` passwords if the ZIP was shared with anyone.
- Keep PostgreSQL port 5432 bound to `127.0.0.1`; never forward it through the router.
- Publish only the API through HTTPS, preferably using the optional Cloudflare Tunnel profile.
- Set `NODE_ENV=production`, an HTTPS `SERVER_URL`, and exact production CORS origins.
- Add the public HTTPS API URL to the Expo production environment before the EAS build.
- Test Docker recovery after a full Windows restart.
- Copy database backups to a second physical location or encrypted cloud storage.
- Enable disk encryption and a Windows login password.
- Keep Windows, Docker Desktop, PostgreSQL image, and Node image patched.
- Set up uptime monitoring against `/api/ready` and alerts for disk space and backup failures.
- Confirm privacy policy, terms, support contact, report/block flows, and account deletion before App Store submission.
