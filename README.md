# Rowan Mobile

Flutter client for the existing Rowan backend and Supabase project.

## Supabase configuration

The app reads compile-time Dart defines. Use the existing Rowan Supabase project URL and its client-safe publishable key. Never use a `service_role` or other secret key in the app.

For a local run, provide the Supabase values and the unified Rowan server origin directly:

```powershell
flutter run --dart-define=SUPABASE_URL=https://hmxcmabaksskjjsbylws.supabase.co --dart-define=SUPABASE_PUBLISHABLE_KEY=sb_publishable_46-DkUPTM9hGpAiUBpbSJw_CjU9CrTM --dart-define=BACKEND_URL=http://localhost:3000
```

The Rowan backend runs on the same unified server. Its API routes are available under `/api`, for example `http://localhost:3000/api/chat` and `http://localhost:3000/api/voice/session`. No separate backend server URL is required.

For a file-based run, create a local untracked `.env` file in the project root using this shape, then pass it with `--dart-define-from-file`:

```json
{
  "SUPABASE_URL": "https://hmxcmabaksskjjsbylws.supabase.co",
  "SUPABASE_PUBLISHABLE_KEY":"sb_publishable_46-DkUPTM9hGpAiUBpbSJw_CjU9CrTM",
  "BACKEND_URL": "http://localhost:3000"
}
```

Do not commit that file. The app fails at startup with the missing variable names when either required Supabase value is absent.
