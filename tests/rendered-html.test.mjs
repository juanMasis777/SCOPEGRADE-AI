import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * Asserts against the HTML `next build` actually prerendered, rather than
 * booting a server: the output is the same one Vercel serves, and the check
 * stays deterministic with no ports or child processes involved.
 */
async function prerendered(file) {
  return readFile(new URL(`../.next/server/app/${file}`, import.meta.url), "utf8");
}

async function manifest(name) {
  return JSON.parse(await readFile(new URL(`../.next/${name}`, import.meta.url), "utf8"));
}

test("the workspace route renders the ScopeGrade shell", async () => {
  const html = await prerendered("index.html");

  assert.match(html, /<html lang="en"/);
  assert.match(html, /<title>ScopeGrade AI/);
});

test("the workspace never leaks data before the session is known", async () => {
  const html = await prerendered("index.html");

  // The shell is rendered signed-out: the authenticated workspace, and every
  // client or proposal inside it, is only mounted in the browser. Without
  // Supabase keys the build renders the setup notice instead.
  assert.match(html, /auth-loading|setup-notice/);
  assert.doesNotMatch(html, /nav-list/);
});

test("social and icon metadata is rendered for sharing", async () => {
  const html = await prerendered("index.html");

  assert.match(html, /property="og:title" content="ScopeGrade AI"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="icon" href="[^"]*\/favicon\.svg"/);
});

test("the client bundle is loaded so the page becomes interactive", async () => {
  const html = await prerendered("index.html");

  assert.match(html, /<script[^>]+src="\/_next\/static\//);
});

test("the public proposal link is a server-rendered route", async () => {
  const routes = await manifest("app-path-routes-manifest.json");
  const prerender = await manifest("prerender-manifest.json");

  assert.equal(routes["/proposal/[token]/page"], "/proposal/[token]");
  // It must stay dynamic: a prerendered token would be served to every visitor.
  assert.ok(!Object.keys(prerender.routes ?? {}).some((route) => route.startsWith("/proposal")));
});
