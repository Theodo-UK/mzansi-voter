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

test("production does not expose the local fixture", async () => {
  const response = await render("/fixture");
  assert.equal(response.status, 404);
});

test("production does not expose the metrics design fixture", async () => {
  const response = await render("/fixture/metrics");
  assert.equal(response.status, 404);
});

test("production redirects anonymous settings visitors", async () => {
  const response = await render("/settings");
  assert.equal(response.status, 307);
  assert.equal(
    new URL(response.headers.get("location"), "http://localhost").pathname,
    "/auth/login",
  );
});
