import os from 'os';

// Configurable constants
const MAX_LOAD_THRESHOLD = 0.8; // 80% load capacity based on CPU cores
const TARPIT_DELAY_MS = 3000;   // 3 seconds

let activeTarpitConnections = 0;
const MAX_CONCURRENT_TARPITS = 1000;

export async function applyAdaptiveTarpit(req: any, res: any): Promise<boolean> {
  const cpus = os.cpus().length || 1;
  // loadavg returns an array [1, 5, 15] minute averages.
  // We use the 1-minute average divided by CPU count to get a rough % usage.
  const currentLoad = os.loadavg()[0] / cpus;

  // Load Shedding Phase: Protect our own server
  if (currentLoad > MAX_LOAD_THRESHOLD || activeTarpitConnections >= MAX_CONCURRENT_TARPITS) {
    console.warn(`[LOAD SHEDDING] Skipping tarpit. Load: ${currentLoad.toFixed(2)}, Active: ${activeTarpitConnections}`);
    // If we are under attack, immediately drop the connection without processing
    if (res.socket && !res.socket.destroyed) {
      res.socket.destroy();
    }
    return false; // Connection dropped
  }

  // Safe to tarpit: Increment counter and wait asynchronously
  activeTarpitConnections++;
  
  return new Promise((resolve) => {
    let cleanedUp = false;
    
    const cleanup = () => {
      if (!cleanedUp) {
        cleanedUp = true;
        activeTarpitConnections = Math.max(0, activeTarpitConnections - 1);
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(true); // Tarpit complete, safe to respond
    }, TARPIT_DELAY_MS);

    // If the client aborted the connection during the tarpit wait, clean up immediately
    if (req.once) {
      req.once('close', () => {
        clearTimeout(timer);
        cleanup();
        resolve(false);
      });
    }
  });
}
