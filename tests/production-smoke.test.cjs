const test = require("node:test");
const assert = require("node:assert/strict");

const baseUrl = (process.env.PRYSM_BASE_URL || "https://prysm-clean.onrender.com").replace(/\/$/, "");
const routes = [
  { path: "/", label: "Accueil" },
  { path: "/rencontres", label: "Rencontres" },
  { path: "/gaydar", label: "Gaydar" },
];

for (const route of routes) {
  test(`production route responds: ${route.label} (${route.path})`, async () => {
    const response = await fetch(new URL(route.path, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "PRYSM-automated-smoke-test/1.0" },
    });

    assert.ok(
      response.status >= 200 && response.status < 400,
      `${route.path} returned HTTP ${response.status}`
    );

    if (response.status >= 200 && response.status < 300) {
      const body = await response.text();
      assert.ok(body.length > 0, `${route.path} returned an empty body`);
    } else {
      assert.ok(
        response.headers.has("location"),
        `${route.path} redirected without a Location header`
      );
    }
  });
}
