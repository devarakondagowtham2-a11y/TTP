import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Difficulty: Number of leading zeros required in hex string (4 = 16 bits of zero)
const DIFFICULTY = 4;

export function generateChallenge(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyProof(challenge: string, nonce: number): boolean {
  const hash = crypto
    .createHash('sha256')
    .update(challenge + nonce)
    .digest('hex');
  
  const target = '0'.repeat(DIFFICULTY);
  return hash.startsWith(target);
}

export function servePowChallenge(req: Request, res: Response) {
  const challenge = generateChallenge();
  
  // Challenge is a server-generated hex string, but we properly encode it to prevent any reflection issues.
  const safeChallenge = encodeURIComponent(challenge);
  
  res.status(402).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Just a moment...</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; height: 100vh; color: #1d1d1d; }
        .container { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.4); text-align: center; max-width: 450px; width: 90%; }
        h1 { font-size: 24px; font-weight: 500; margin-bottom: 16px; }
        p { font-size: 15px; color: #5c5c5c; line-height: 1.5; margin-bottom: 24px; }
        .spinner { margin: 0 auto 24px; width: 40px; height: 40px; border: 4px solid rgba(0, 0, 0, 0.1); border-left-color: #0051c3; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .footer { font-size: 12px; color: #999; margin-top: 32px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h1>Checking your browser before accessing the site.</h1>
        <p>This process is automatic. Your browser will redirect to your requested content shortly.</p>
        <p id="status-text" style="font-family: monospace; font-size: 13px; color: #777;">Solving cryptographic challenge...</p>
        <div class="footer">Performance & Security by Trojan Tarpit Protocol</div>
      </div>
      <script>
        async function solve() {
          const challenge = "${safeChallenge}";
          const difficulty = ${DIFFICULTY};
          let nonce = 0;
          const encoder = new TextEncoder();
          const target = '0'.repeat(difficulty);
          const statusText = document.getElementById('status-text');

          await new Promise(r => setTimeout(r, 100)); // Allow UI to render

          while (true) {
            const data = encoder.encode(challenge + nonce);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (hashHex.startsWith(target)) {
              statusText.innerText = "Challenge solved! Redirecting...";
              window.location.href = window.location.pathname + "?challenge=" + encodeURIComponent(challenge) + "&nonce=" + nonce;
              return;
            }
            nonce++;
            
            if (nonce % 1000 === 0) {
              statusText.innerText = "Solving challenge... (" + nonce + " hashes)";
              await new Promise(r => setTimeout(r, 0)); // Yield to main thread to update UI
            }
          }
        }
        solve();
      </script>
    </body>
    </html>
  `);
}

export function requirePow(req: Request, res: Response, next: NextFunction) {
  const { challenge, nonce } = req.query;
  
  if (typeof challenge === 'string' && typeof nonce === 'string') {
    const parsedNonce = parseInt(nonce, 10);
    if (!isNaN(parsedNonce) && parsedNonce >= 0 && parsedNonce <= Number.MAX_SAFE_INTEGER) {
      const isValid = verifyProof(challenge, parsedNonce);
      if (isValid) {
        return next();
      }
    }
  }
  
  // If no valid PoW, serve the challenge
  servePowChallenge(req, res);
}
