import { Request } from 'express';
import crypto from 'crypto';

export interface Fingerprint {
  id: string;
  ip: string;
  subnet: string;
  ja4: string;
  headerOrder: string;
  userAgent: string;
}

export function generateFingerprint(req: Request): Fingerprint {
  const ip = req.ip || '0.0.0.0';
  const subnet = ip.split('.').slice(0, 3).join('.'); // IPv4 simple subnet /24
  const headerOrder = Object.keys(req.headers).join(',');
  const userAgent = req.get('user-agent') || '';
  
  // In a real production environment, a reverse proxy (like Cloudflare or Nginx)
  // would extract the JA4 TLS fingerprint and forward it in a header.
  const ja4 = req.get('x-ja4-fingerprint') || 'ja4_unavailable_without_proxy';
  
  const id = crypto
    .createHash('sha256')
    .update(`${ip}|${headerOrder}|${userAgent}|${ja4}`)
    .digest('hex');

  return {
    id,
    ip,
    subnet,
    ja4,
    headerOrder,
    userAgent
  };
}
