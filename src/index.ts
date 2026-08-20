import express, { Request, Response, NextFunction } from 'express';
import { generateFingerprint } from './fingerprint';
import { trackSession, confirmBot, getSessionTrust, TrustTier } from './cascade';
import { applyAdaptiveTarpit } from './tarpit';
import { requirePow } from './pow';
import { poisonData, Product } from './poison';

const app = express();
app.set('trust proxy', true);

// Dummy database of real products
const realProducts: Product[] = [
  { id: '100', name: 'Premium Widget', price: 99.99, stock: 15 },
  { id: '101', name: 'Standard Widget', price: 29.99, stock: 400 },
  { id: '102', name: 'Budget Widget', price: 9.99, stock: 0 },
  { id: '103', name: 'Luxury Widget', price: 299.99, stock: 5 },
  { id: '104', name: 'Bulk Widget Pack', price: 49.99, stock: 150 },
];

// Global middleware to track fingerprints and handle TTP Logic
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // 1. Mandatory rDNS check would go here to allow Googlebot/Bingbot.
  // For this demo, we assume the user is not a verified search engine.

  // 2. Generate and track the fingerprint
  const fp = generateFingerprint(req);
  trackSession(fp);
  
  // Attach fingerprint to the request for downstream use
  (req as any).fingerprint = fp;

  // 3. Check Trust Tier
  const trust = getSessionTrust(fp.id);

  if (trust === TrustTier.CONFIRMED_BOT) {
    // High confidence bot -> Tarpit delay (if server load allows)
    const survivedTarpit = await applyAdaptiveTarpit(req, res);
    if (!survivedTarpit) return; // Connection was dropped to protect server
    return next();
  } else if (trust === TrustTier.SUSPICIOUS) {
    // Low confidence / Cascaded match -> Challenge them
    return requirePow(req, res, next);
  }

  // Trusted (Score 0) -> Let them through normally
  next();
});

// ==============================================================
// PHASE 1: THE GIFT (Deceptive Acceptance)
// ==============================================================

// Honeypot Form Endpoint
app.post('/api/newsletter/subscribe', express.urlencoded({ extended: true }), (req, res) => {
  const fp = (req as any).fingerprint;
  // If the hidden 'honeypot_email' field is filled out, it's a bot
  if (req.body && typeof req.body === 'object' && req.body.honeypot_email) {
    confirmBot(fp, 'honeypot-field-filled');
    // Return a 200 OK fake success response
    return res.status(200).json({ success: true, message: 'Thanks for subscribing!' });
  }
  res.status(200).json({ success: true, message: 'Thanks for subscribing!' });
});

// Decoy Maze Endpoint
app.get('/admin/debug/prices', (req, res) => {
  const fp = (req as any).fingerprint;
  confirmBot(fp, 'touched-disallowed-endpoint');
  
  // Return fake success instead of 403
  res.status(200).json({ status: 'active', maze: '/admin/debug/prices/v2' });
});

// ==============================================================
// THE PAYLOAD ENDPOINT (Where poisoning happens)
// ==============================================================

app.get('/api/products', (req, res) => {
  const fp = (req as any).fingerprint;
  const trust = getSessionTrust(fp.id);

  if (trust === TrustTier.CONFIRMED_BOT) {
    // Serve Schema-Preserving Poisoned Data
    // Bot thinks it won, but the relationships are ruined
    const fakeData = poisonData(realProducts, fp.id);
    return res.json(fakeData);
  }

  // Trusted users get real data
  res.json(realProducts);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Trojan Tarpit Protocol demo listening on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/products (Legitimate endpoint)');
  console.log('  POST /api/newsletter/subscribe (Contains honeypot field)');
  console.log('  GET  /admin/debug/prices (Disallowed decoy endpoint)');
});
