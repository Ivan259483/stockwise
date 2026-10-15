/**
 * Runs the whole automated test suite against an isolated TEST stack:
 *
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
const run = (cwd, args, { background = false } = {}) => {
  const child = spawn("npm", args, { cwd: `${ROOT}${cwd}`, stdio: background ? "ignore" : "inherit" });
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

  console.log("== 1/4 Seeding the test database (stockwise_test)");
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

  console.log(`\nSmoke test: ${smoke === 0 ? "PASS" : "FAIL"} · E2E test: ${e2e === 0 ? "PASS" : "FAIL"}`);
  return smoke === 0 && e2e === 0 ? 0 : 1;
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
