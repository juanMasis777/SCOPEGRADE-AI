import assert from "node:assert/strict";
import test from "node:test";

import {
  assessProject,
  complexityScore,
  defaultValidUntil,
  depositAmount,
  CUSTOM_BASE_PRICE,
  initialProjectInput,
  money,
  PROFESSIONAL_BASE_PRICE,
  PROMOTIONAL_PRICE,
  WEBAPP_BASE_PRICE,
} from "../lib/pricing.ts";

/** Builds a project request from the defaults plus the given overrides. */
function project(overrides = {}) {
  return { ...initialProjectInput, projectName: "Test project", clientName: "Test client", ...overrides };
}

test("a simple one-page site stays on the promotional offer", () => {
  const result = assessProject(project());

  assert.equal(result.packageName, "Promotional");
  assert.equal(result.grade, "A");
  assert.equal(result.price, PROMOTIONAL_PRICE);
  assert.ok(result.included.length > 0);
});

test("the care plan is the only promotional add-on, and it is opt-in", () => {
  assert.deepEqual(assessProject(project({ maintenance: false })).extras, []);
  assert.equal(assessProject(project({ maintenance: true })).extras.length, 1);
});

test("any advanced feature moves a landing page off the promotional price", () => {
  for (const feature of ["bilingual", "booking", "payments", "clientLogin", "customDesign", "rush"]) {
    const result = assessProject(project({ [feature]: true }));
    assert.notEqual(result.packageName, "Promotional", `${feature} should leave the promotional tier`);
    assert.ok(result.price > PROMOTIONAL_PRICE, `${feature} should raise the price`);
  }
});

test("a fifth section or a second page leaves the promotional tier", () => {
  assert.equal(assessProject(project({ sections: 5 })).packageName, "Professional");
  assert.equal(assessProject(project({ pages: 2 })).packageName, "Professional");
});

test("a small business website is graded Professional at the base price", () => {
  const result = assessProject(project({ projectType: "business", pages: 5, sections: 6 }));

  assert.equal(result.packageName, "Professional");
  assert.equal(result.grade, "B");
  assert.equal(result.price, PROFESSIONAL_BASE_PRICE);
});

test("professional pricing adds each requested integration", () => {
  const base = assessProject(project({ projectType: "business", pages: 5 })).price;
  const bilingual = assessProject(project({ projectType: "business", pages: 5, bilingual: true })).price;
  const payments = assessProject(project({ projectType: "business", pages: 5, payments: true })).price;

  assert.equal(bilingual, base + 250);
  assert.equal(payments, base + 450);
});

test("rush delivery applies a 25% premium", () => {
  const standard = assessProject(project({ projectType: "business", pages: 5 })).price;
  const rushed = assessProject(project({ projectType: "business", pages: 5, rush: true })).price;

  assert.equal(rushed, Math.round((standard * 1.25) / 25) * 25);
  assert.ok(rushed > standard);
});

test("add-ons land on a clean rounding step above the advertised base", () => {
  const professional = assessProject(project({ projectType: "business", pages: 9, bilingual: true, contentReady: false }));
  const custom = assessProject(project({ projectType: "ecommerce", pages: 12, payments: true }));

  assert.equal((professional.price - PROFESSIONAL_BASE_PRICE) % 25, 0);
  assert.equal((custom.price - CUSTOM_BASE_PRICE) % 50, 0);
});

test("a request with no add-ons quotes the advertised starting price", () => {
  assert.equal(assessProject(project({ projectType: "business", pages: 5 })).price, PROFESSIONAL_BASE_PRICE);
  assert.equal(assessProject(project({ projectType: "ecommerce", pages: 5 })).price, CUSTOM_BASE_PRICE);
  assert.equal(assessProject(project({ projectType: "webapp", pages: 5 })).price, WEBAPP_BASE_PRICE);
});

test("stores and web applications are always Custom", () => {
  assert.equal(assessProject(project({ projectType: "ecommerce" })).packageName, "Custom");
  assert.equal(assessProject(project({ projectType: "webapp" })).packageName, "Custom");
});

test("customer logins force a Custom project whatever the site type", () => {
  const result = assessProject(project({ projectType: "business", clientLogin: true }));

  assert.equal(result.packageName, "Custom");
  assert.equal(result.grade, "C");
  assert.ok(result.reasons.some((reason) => reason.toLowerCase().includes("account")));
});

test("a heavy business website crosses into Custom on complexity alone", () => {
  const result = assessProject(project({ projectType: "business", pages: 12, payments: true, bilingual: true }));

  assert.ok(complexityScore(project({ projectType: "business", pages: 12, payments: true, bilingual: true })) >= 16);
  assert.equal(result.packageName, "Custom");
});

test("complexity never decreases when scope is added", () => {
  const base = complexityScore(project());
  const richer = complexityScore(project({ pages: 4, sections: 8, payments: true }));

  assert.ok(richer > base);
});

test("unready content is charged in both paid tiers", () => {
  const professional = project({ projectType: "business", pages: 5 });
  const custom = project({ projectType: "webapp" });

  assert.equal(
    assessProject({ ...professional, contentReady: false }).price - assessProject(professional).price,
    150,
  );
  assert.equal(
    assessProject({ ...custom, contentReady: false }).price - assessProject(custom).price,
    250,
  );
});

test("deposits round to whole cents", () => {
  assert.equal(depositAmount(99.99, 50), 50);
  assert.equal(depositAmount(1700, 50), 850);
  assert.equal(depositAmount(699, 30), 209.7);
  assert.equal(depositAmount(0, 50), 0);
});

test("money hides cents for whole amounts and keeps them otherwise", () => {
  assert.equal(money(699), "$699.00".replace(".00", ""));
  assert.equal(money(99.99), "$99.99");
});

test("a proposal stays open for fourteen days", () => {
  assert.equal(defaultValidUntil(new Date("2026-01-01T12:00:00Z")), "2026-01-15");
});
