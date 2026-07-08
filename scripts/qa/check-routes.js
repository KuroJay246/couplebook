const { DEFAULT_ROUTES, fail, httpRequest, log, withServer } = require('./lib');

async function checkRoutes() {
  let hasFailure = false;

  await withServer(async () => {
    for (const route of DEFAULT_ROUTES) {
      try {
        const response = await httpRequest(route);
        if (response.statusCode !== 200) {
          hasFailure = true;
          fail(`Route failed: ${route} -> ${response.statusCode}`);
          continue;
        }
        log(`Route OK: ${route} -> 200`);
      } catch (error) {
        hasFailure = true;
        fail(`Route error: ${route} -> ${error.message}`);
      }
    }
  });

  if (hasFailure) {
    process.exitCode = 1;
    return;
  }

  log('Route check passed.');
}

checkRoutes().catch((error) => {
  fail(`Route check crashed: ${error.message}`);
});
