import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classifyTrafficSource,
  classifyTraffic,
  TRAFFIC_ORDER,
} from "./traffic-source.ts";

describe("classifyTrafficSource", () => {
  test("Facebook-ийн бүх домэйн нэг сувагт орно", () => {
    // 2026-09-16-нд GA4-д бодитоор ирсэн домэйнууд
    for (const s of [
      "facebook.com",
      "m.facebook.com",
      "l.facebook.com",
      "lm.facebook.com",
    ]) {
      assert.equal(classifyTrafficSource(s, "referral"), "facebook", s);
    }
  });

  test("Facebook сурталчилгаа тусдаа", () => {
    assert.equal(classifyTrafficSource("fb", "paid"), "facebook_ads");
    assert.equal(classifyTrafficSource("facebook", "cpc"), "facebook_ads");
  });

  test("Instagram — органик ба төлбөртэй", () => {
    assert.equal(classifyTrafficSource("instagram.com", "referral"), "instagram");
    assert.equal(classifyTrafficSource("ig", "paid"), "instagram_ads");
  });

  test("Messenger нь Facebook биш", () => {
    assert.equal(classifyTrafficSource("m.me", "referral"), "messenger");
    assert.equal(classifyTrafficSource("messenger.com", "referral"), "messenger");
    assert.equal(classifyTrafficSource("l.messenger.com", "referral"), "messenger");
  });

  test("Google — хайлт ба сурталчилгаа", () => {
    assert.equal(classifyTrafficSource("google", "organic"), "google");
    assert.equal(classifyTrafficSource("google", "cpc"), "google_ads");
  });

  test("accounts.google.com нь хайлт БИШ", () => {
    // Нэвтрэлтээс буцаж ирсэн зочин — хайлтын үр дүн гэж тоолвол
    // SEO-гийн тоо худал өснө.
    assert.equal(
      classifyTrafficSource("accounts.google.com", "referral"),
      "referral",
    );
  });

  test("шууд орсон", () => {
    assert.equal(classifyTrafficSource("(direct)", "(none)"), "direct");
  });

  test("танихгүй эх сурвалж", () => {
    assert.equal(classifyTrafficSource("(not set)", "(not set)"), "other");
  });

  test("том жижиг үсэг, зай хамаарахгүй", () => {
    assert.equal(classifyTrafficSource(" Facebook.COM ", " Referral "), "facebook");
  });
});

describe("classifyTraffic", () => {
  // 2026-09-16-ны бодит өгөгдөл
  const real = [
    { source: "facebook.com", medium: "referral", sessions: 106, users: 90 },
    { source: "(direct)", medium: "(none)", sessions: 103, users: 55 },
    { source: "fb", medium: "paid", sessions: 47, users: 43 },
    { source: "l.facebook.com", medium: "referral", sessions: 44, users: 13 },
    { source: "m.facebook.com", medium: "referral", sessions: 31, users: 24 },
    { source: "lm.facebook.com", medium: "referral", sessions: 14, users: 13 },
    { source: "google", medium: "organic", sessions: 10, users: 9 },
    { source: "fb", medium: "paid", sessions: 6, users: 6 },
    { source: "fb", medium: "paid", sessions: 6, users: 6 },
    { source: "fb", medium: "paid", sessions: 5, users: 5 },
    { source: "accounts.google.com", medium: "referral", sessions: 3, users: 3 },
    { source: "(not set)", medium: "(not set)", sessions: 1, users: 1 },
    { source: "ig", medium: "paid", sessions: 1, users: 1 },
  ];

  test("Facebook-ийн 4 домэйн нийлнэ", () => {
    const out = classifyTraffic(real);
    const fb = out.find((r) => r.key === "facebook");
    assert.equal(fb?.sessions, 106 + 44 + 31 + 14); // 195
  });

  test("сурталчилгааны кампанит ажлууд нийлнэ", () => {
    const out = classifyTraffic(real);
    assert.equal(out.find((r) => r.key === "facebook_ads")?.sessions, 47 + 6 + 6 + 5); // 64
    assert.equal(out.find((r) => r.key === "instagram_ads")?.sessions, 1);
  });

  test("нийт сешн хэвээрээ — нэг ч мөр алдагдахгүй", () => {
    const out = classifyTraffic(real);
    const total = real.reduce((s, r) => s + r.sessions, 0);
    assert.equal(out.reduce((s, r) => s + r.sessions, 0), total);
  });

  test("сешнгүй суваг хүснэгтэд гарахгүй", () => {
    const out = classifyTraffic(real);
    assert.equal(out.some((r) => r.key === "messenger"), false);
    assert.equal(out.some((r) => r.sessions === 0), false);
  });

  test("эрэмбэ тогтмол", () => {
    const out = classifyTraffic(real);
    const idx = out.map((r) => TRAFFIC_ORDER.indexOf(r.key));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  });
});
