// Deliberately bypass the marketing layout and its analytics. OAuth query
// parameters are neither rendered nor forwarded to another service.
export function GET() {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Return to Worthlane</title>
<style>body{margin:0;background:#f8f5ed;color:#253d33;font-family:system-ui,sans-serif}main{max-width:34rem;margin:12vh auto;padding:2rem}h1{font-size:2rem;line-height:1.2}p{line-height:1.6}.brand{font-weight:600;letter-spacing:.12em;text-transform:uppercase}</style></head>
<body><main><p class="brand">Worthlane</p><h1>Return to the Worthlane app</h1><p>Continue your bank connection in the app. This page does not confirm that your account is connected; Worthlane will show the result there.</p><p>If the app did not open, switch back to Worthlane. If the connection has expired, start Connect bank again.</p></main></body></html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
