/**
 * Runs the whole automated test suite against an isolated TEST stack:
 *
 *   0. runs the presentation seed into a throwaway "stockwise_seedcheck"
 *      database and verifies it with check-data (the demo DB is not touched)
 *   1. resets the local "stockwise_test" database with fixture data (seed:test)
 *   2. starts the API on :5051 (server/.env.test) and the client on :5174
 *   3. runs the API smoke test, then the headless-Chrome E2E test
 *   4. stops both servers
 *
 * The demo database (stockwise_dev) and the live Atlas database are never
 * used: both tests also refuse to run if the API reports a database whose
 * name does not end in "_test".
 *
 * Usage: cd tools && node run-tests.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const API_HEALTH = "http://localhost:5051/api/health";
const CLIENT_URL = "http://localhost:5174";

const children = [];

/** Runs an npm script and resolves with its exit code (output is streamed). */
const run = (cwd, args, { background = false, env } = {}) => {
  const child = spawn("npm", args, {
    cwd: `${ROOT}${cwd}`,
    stdio: background ? "ignore" : "inherit",
    env: { ...process.env, ...env },
  });
  if (background) {
    children.push(child);
    return child;
  }
  return new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
};

/** True when something already answers on `url`. */
const isUp = (url) =>
  fetch(url)
    .then(() => true)
    .catch(() => false);

/** Polls `url` until it answers or the timeout passes. */
const waitFor = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const stopAll = () => children.forEach((child) => child.kill("SIGTERM"));
process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});

const main = async () => {
  if ((await isUp(API_HEALTH)) || (await isUp(CLIENT_URL))) {
    throw new Error("Ports 5051/5174 are already in use. Stop the running test servers first.");
  }

  console.log("== 0/4 Presentation seed + check-data on a throwaway database (stockwise_seedcheck)");
  const seedCheckEnv = { MONGO_URI: "mongodb://127.0.0.1:27017/stockwise_seedcheck" };
  const seedOk =
    (await run("server", ["run", "seed"], { env: seedCheckEnv })) === 0 &&
    (await run("server", ["run", "check-data"], { env: seedCheckEnv })) === 0;

  console.log("\n== 1/4 Seeding the test database (stockwise_test)");
  if ((await run("server", ["run", "seed:test"])) !== 0) throw new Error("seed:test failed");

  console.log("== 2/4 Starting the test API (:5051) and test client (:5174)");
  run("server", ["run", "dev:test"], { background: true });
  run("client", ["run", "dev:test"], { background: true });
  await waitFor(API_HEALTH);
  await waitFor(CLIENT_URL);

  console.log("\n== 3/4 API smoke test");
  const smoke = await run("server", ["run", "smoke"]);

  console.log("\n== 4/4 Browser E2E test");
  const e2e = await run("tools", ["run", "e2e"]);

  const verdict = (ok) => (ok ? "PASS" : "FAIL");
  console.log(
    `\nSeed check: ${verdict(seedOk)} · Smoke test: ${verdict(smoke === 0)} · E2E test: ${verdict(e2e === 0)}`
  );
  return seedOk && smoke === 0 && e2e === 0 ? 0 : 1;
};

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(stopAll);
