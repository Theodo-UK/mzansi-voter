import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("production redirects anonymous visitors before rendering the ballot", async () => {
  const response = await render();
  assert.equal(response.status, 307);
  assert.equal(
    new URL(response.headers.get("location"), "http://localhost").pathname,
    "/auth/login",
  );
});

test("the removed ballot preview route stays unavailable", async () => {
  const response = await render("/fixture");
  assert.equal(response.status, 404);
});

test("the removed metrics preview route stays unavailable", async () => {
  const response = await render("/fixture/metrics");
  assert.equal(response.status, 404);
});

test("oauth callback distinguishes a missing authorization code", async () => {
  const response = await render("/auth/callback");
  assert.equal(response.status, 307);

  const location = new URL(
    response.headers.get("location"),
    "http://localhost",
  );
  assert.equal(location.pathname, "/auth/denied");
  assert.equal(location.searchParams.get("reason"), "missing_code");
});

test("oauth callback reads the authorization code from the request URL", async () => {
  const response = await render("/auth/callback?code=test-authorization-code");
  assert.equal(response.status, 307);

  const location = new URL(
    response.headers.get("location"),
    "http://localhost",
  );
  assert.equal(location.pathname, "/auth/denied");
  assert.notEqual(location.searchParams.get("reason"), "missing_code");
});

test("oauth denial offers a fresh Google sign-in", async () => {
  const response = await render("/auth/denied?reason=expired");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /The trolley hit a pothole/);
  assert.match(html, /Your sign-in expired before it could finish/);
  assert.match(html, /Try Google sign-in again/);
});

test("metrics requires authentication in every deployment", async () => {
  const response = await render("/metrics");
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/auth\/login$/);
});

test("production redirects anonymous settings visitors", async () => {
  const response = await render("/settings");
  assert.equal(response.status, 307);
  assert.equal(
    new URL(response.headers.get("location"), "http://localhost").pathname,
    "/auth/login",
  );
});
