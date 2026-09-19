import assert from "node:assert/strict";
import test from "node:test";

/**
 * Renders a route through the built Cloudflare Worker, the same entry point the
 * deployed site uses, and returns the response together with its HTML body.
 */
async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request(`http://localhost${pathname}`, {
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

  return { response, html: await response.text() };
}

test("the workspace route renders the ScopeGrade shell", async () => {
  const { response, html } = await render("/");

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>ScopeGrade AI/);
});

test("the workspace never leaks data before the session is known", async () => {
  const { html } = await render("/");

  // The shell is rendered signed-out: the authenticated workspace, and every
  // client or proposal inside it, is only mounted in the browser. Without
  // Supabase keys the build renders the setup notice instead.
  assert.match(html, /auth-loading|setup-notice/);
  assert.doesNotMatch(html, /nav-list/);
});

test("social and icon metadata is rendered for sharing", async () => {
  const { html } = await render("/");

  assert.match(html, /property="og:title" content="ScopeGrade AI"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="icon" href="[^"]*\/favicon\.svg"/);
});

test("a public proposal link renders its own page", async () => {
  const { response, html } = await render("/proposal/00000000-0000-4000-8000-000000000000");

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(html, /public-proposal-state|setup-notice/);
});

test("the client-side bundle is preloaded so the page becomes interactive", async () => {
  const { html } = await render("/");

  assert.match(html, /rel="modulepreload"/);
  assert.match(html, /<script/);
});
