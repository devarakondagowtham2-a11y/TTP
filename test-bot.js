const http = require('http');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers
      }
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body,
          timeMs: Date.now() - startTime
        });
      });
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runDemo() {
  console.log("=== TROJAN TARPIT PROTOCOL DEMO ===\n");

  console.log("1. Normal User fetching products...");
  let res = await makeRequest('/api/products');
  console.log(`[Time: ${res.timeMs}ms] Status: ${res.statusCode}`);
  console.log("Data:", res.body, "\n");

  console.log("2. Bot Scraper falls for the Decoy Maze (GET forbidden path)...");
  res = await makeRequest('/admin/debug/prices');
  console.log(`[Time: ${res.timeMs}ms] Status: ${res.statusCode} (Bot thinks it succeeded!)`);
  console.log("Response:", res.body, "\n");

  console.log("3. Confirmed Bot fetching products (Triggering Tarpit + Poisoning)...");
  res = await makeRequest('/api/products');
  console.log(`[Time: ${res.timeMs}ms] Status: ${res.statusCode}`);
  console.log("Poisoned Data:", res.body, "\n");
  console.log("Notice the delay? The server tarpitted the bot for 3 seconds.\nNotice the prices? They are completely scrambled and wrong, but structurally perfect.\n");

  console.log("4. A new headless browser on the same network (Cascade Detection)...");
  // We simulate a different session by adding a header (changes Fingerprint ID)
  // but it shares the same IP and User-Agent, so the cascade clustering catches it.
  res = await makeRequest('/api/products', 'GET', null, { 'Accept-Language': 'en-US' });
  console.log(`[Time: ${res.timeMs}ms] Status: ${res.statusCode} (402 Payment Required for PoW)`);
  console.log("Response contains PoW Challenge HTML (Scraper fails, real browser solves).");
}

runDemo();
