<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Signing in…</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f8fafc;
            color: #334155;
        }
        .card {
            text-align: center;
            padding: 2rem 3rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 24px rgba(0,0,0,.08);
        }
        h2 { margin: 0 0 .5rem; font-size: 1.2rem; }
        p  { margin: 0; font-size: .9rem; color: #64748b; }
    </style>
</head>
<body>
<div class="card">
    <h2>✅ Signed in successfully</h2>
    <p>Uploading your syllabus to Google Drive…<br>This window will close automatically.</p>
</div>
<script>
    /**
     * Google's implicit-flow redirect lands here with the access_token in the
     * URL fragment (hash). We parse it and post it back to the opener window
     * via postMessage, then close this popup.
     */
    (function () {
        const params = {};
        window.location.hash.replace(/^#/, '').split('&').forEach(function (pair) {
            const kv = pair.split('=');
            params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        });

        const opener = window.opener;
        if (!opener) {
            document.querySelector('p').textContent = 'Could not communicate with the main window. Please close this tab and try again.';
            return;
        }

        if (params.access_token) {
            opener.postMessage({ type: 'GOOGLE_OAUTH_TOKEN', token: params.access_token }, window.location.origin);
        } else if (params.error) {
            opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: params.error }, window.location.origin);
        } else {
            opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: 'No token received.' }, window.location.origin);
        }

        // Give the UI a moment to show the success message before closing
        setTimeout(function () { window.close(); }, 1200);
    })();
</script>
</body>
</html>