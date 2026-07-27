import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("server-renders the Mzansi Voter product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>Mzansi Voter \| The office shop, democratically<\/title>/i,
  );
  assert.match(html, /Voting list/);
  assert.match(html, /Cape Town(?:<!-- -->)? office ballot/);
  assert.match(html, /Shopping at (?:<!-- -->)?Checkers/);
  assert.match(html, /Suggest an item for the list/);
  assert.match(html, /Out of budget/);
  assert.match(html, /Added by (?:<!-- -->)?Anele Moyo/);
  assert.match(html, /Theodo Cape Town/);
  assert.match(html, /Office groceries, voted lekker/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
  assert.doesNotMatch(html, /Dev preview|Admin mode/);
});
