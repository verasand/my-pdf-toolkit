# High-Fidelity Unlock (Optional)

The unlock flow in `src/App.tsx` is now hybrid:

1. Try a local `qpdf` unlock service (high fidelity, preserves original PDF structure).
2. If unavailable, fall back to browser-only unlock automatically.
3. If needed, fall back again to render-based rebuild (PNG, higher scale).

## Local setup

1. Install `qpdf` and ensure it is available as `qpdf` in your terminal.
2. Copy `.env.example` to `.env` (optional):

```bash
VITE_QPDF_UNLOCK_URL=http://127.0.0.1:8787/unlock
```

3. Start the local unlock service:

```bash
npm run unlock:server
```

Default service address is `http://127.0.0.1:8787`.

## Optional environment variables

- `QPDF_PATH`: path to the `qpdf` executable if it is not in PATH.
- `UNLOCK_SERVER_HOST`: host bind for the unlock service (default `127.0.0.1`).
- `UNLOCK_SERVER_PORT`: port for the unlock service (default `8787`).
- `UNLOCK_SERVER_MAX_BODY_BYTES`: max request body size in bytes (default `83886080`).
