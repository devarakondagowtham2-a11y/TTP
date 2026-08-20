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
    <html>
      <head><title>Checking your browser...</title></head>
      <body>
        <p>Verifying secure connection...</p>
        <script>
          async function solve() {
            const challenge = "${safeChallenge}";
            const difficulty = ${DIFFICULTY};
            let nonce = 0;
            const encoder = new TextEncoder();
            const target = '0'.repeat(difficulty);

            while (true) {
              const data = encoder.encode(challenge + nonce);
              const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

              if (hashHex.startsWith(target)) {
                // Submit the answer and reload the page
                window.location.href = window.location.pathname + "?challenge=" + encodeURIComponent(challenge) + "&nonce=" + nonce;
                return;
              }
              nonce++;
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
