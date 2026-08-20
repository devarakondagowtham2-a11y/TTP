import { Fingerprint } from './fingerprint';

const confirmedBots = new Map<string, { reason: string; timestamp: number; score: number }>();
const activeSessions = new Map<string, Fingerprint>();

const MAX_SESSIONS = 10000;
const MAX_CONFIRMED = 10000;

export enum TrustTier {
  TRUSTED = 0,
  SUSPICIOUS = 50,
  CONFIRMED_BOT = 100
}

export function trackSession(fp: Fingerprint) {
  if (activeSessions.size >= MAX_SESSIONS) {
    // Evict oldest session
    const firstKey = activeSessions.keys().next().value;
    if (firstKey) activeSessions.delete(firstKey);
  }
  activeSessions.set(fp.id, fp);
}

export function confirmBot(fp: Fingerprint, reason: string) {
  if (confirmedBots.size >= MAX_CONFIRMED) {
    const firstKey = confirmedBots.keys().next().value;
    if (firstKey) confirmedBots.delete(firstKey);
  }
  confirmedBots.set(fp.id, {
    reason,
    timestamp: Date.now(),
    score: TrustTier.CONFIRMED_BOT
  });
  
  // Cascade detection: find related sessions
  const cluster = findCluster(fp);
  cluster.forEach((relatedFp) => {
    if (!confirmedBots.has(relatedFp.id)) {
      confirmedBots.set(relatedFp.id, {
        reason: `cascaded-from:${fp.id}`,
        timestamp: Date.now(),
        score: TrustTier.SUSPICIOUS
      });
      console.log(`[CASCADE] Flagged session ${relatedFp.id} due to shared fingerprint with ${fp.id}`);
    }
  });
}

export function getSessionTrust(fpId: string): number {
  if (confirmedBots.has(fpId)) {
    return confirmedBots.get(fpId)!.score;
  }
  return TrustTier.TRUSTED;
}

function findCluster(seed: Fingerprint): Fingerprint[] {
  const cluster: Fingerprint[] = [];
  
  for (const fp of activeSessions.values()) {
    if (fp.id === seed.id) continue;
    
    // Clustering logic: A match requires Subnet AND (JA4 OR HeaderOrder OR UserAgent)
    const subnetMatch = fp.subnet === seed.subnet;
    const ja4Match = fp.ja4 === seed.ja4 && seed.ja4 !== 'ja4_unavailable_without_proxy';
    const headerMatch = fp.headerOrder === seed.headerOrder;
    const uaMatch = fp.userAgent === seed.userAgent && seed.userAgent !== '';
    
    if (subnetMatch && (ja4Match || headerMatch || uaMatch)) {
      cluster.push(fp);
    }
  }
  return cluster;
}
