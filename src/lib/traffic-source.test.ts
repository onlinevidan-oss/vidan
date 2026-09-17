import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classifyTrafficSource,
  classifyTraffic,
  TRAFFIC_ORDER,
  TRAFFIC_ALWAYS_SHOWN,
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

  test("Instagram — органик ба сурталчилгаа нэг мөр", () => {
    // Facebook шиг хоёр салгах хэмжээний урсгал байхгүй тул нэгтгэв.
    assert.equal(classifyTrafficSource("instagram.com", "referral"), "instagram");
    assert.equal(classifyTrafficSource("ig", "paid"), "instagram");
  });

  test("чат нь Facebook биш — Messenger, Viber нэг мөрөнд", () => {
    assert.equal(classifyTrafficSource("m.me", "referral"), "chat");
    assert.equal(classifyTrafficSource("messenger.com", "referral"), "chat");
    assert.equal(classifyTrafficSource("l.messenger.com", "referral"), "chat");
    assert.equal(classifyTrafficSource("viber.com", "referral"), "chat");
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

  test("өөрсдийн тавьсан UTM шошго таарна", () => {
    // Холбоос үүсгэгчийн гаргадаг утгууд — хоёр газар зөрвөл
    // трафик "Тодорхойгүй" рүү унана.
    assert.equal(classifyTrafficSource("qr", "offline"), "qr");
    assert.equal(classifyTrafficSource("sms", "sms"), "sms");
    assert.equal(classifyTrafficSource("email", "email"), "email");
    assert.equal(classifyTrafficSource("print", "offline"), "print");
    assert.equal(classifyTrafficSource("chat", "chat"), "chat");
    assert.equal(classifyTrafficSource("messenger", "chat"), "chat");
    assert.equal(classifyTrafficSource("viber", "chat"), "chat");
  });

  test("шошго нь домэйн таамаглахаас дээгүүр", () => {
    // `utm_source=chat` тавьсан бол medium юу ч байсан чат гэж ангилна.
    assert.equal(classifyTrafficSource("chat", "referral"), "chat");
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
    // Instagram-ын сурталчилгаа органиктайгаа нэг мөрөнд
    assert.equal(out.find((r) => r.key === "instagram")?.sessions, 1);
  });

  test("нийт сешн хэвээрээ — нэг ч мөр алдагдахгүй", () => {
    const out = classifyTraffic(real);
    const total = real.reduce((s, r) => s + r.sessions, 0);
    assert.equal(out.reduce((s, r) => s + r.sessions, 0), total);
  });

  test("өгөгдмөлөөр сешнгүй суваг гарахгүй", () => {
    const out = classifyTraffic(real);
    assert.equal(out.some((r) => r.key === "chat"), false);
    assert.equal(out.some((r) => r.sessions === 0), false);
  });

  test("includeEmpty — үндсэн сувгууд 0-ээр ч гарна", () => {
    const out = classifyTraffic(real, { includeEmpty: true });
    assert.equal(out.find((r) => r.key === "chat")?.sessions, 0);
    assert.equal(out.find((r) => r.key === "sms")?.sessions, 0);
    // Тоонууд гуйвахгүй
    assert.equal(out.find((r) => r.key === "facebook")?.sessions, 195);
  });

  test("тухай бүрийн суваг хандалтгүй бол огт гарахгүй", () => {
    // QR, и-мэйл, хэвлэмэл, Google сурталчилгаа — хүснэгт уртасгахгүй
    const out = classifyTraffic(real, { includeEmpty: true });
    for (const k of ["qr", "email", "print", "google_ads"]) {
      assert.equal(out.some((r) => r.key === k), false, k);
    }
  });

  test("тухай бүрийн суваг хандалттай бол гарна", () => {
    const out = classifyTraffic(
      [...real, { source: "qr", medium: "offline", sessions: 4, users: 3 }],
      { includeEmpty: true },
    );
    assert.equal(out.find((r) => r.key === "qr")?.sessions, 4);
  });

  test("үргэлж харагдах суваг бүр эрэмбэд байна", () => {
    for (const k of TRAFFIC_ALWAYS_SHOWN) {
      assert.ok(TRAFFIC_ORDER.includes(k), k);
    }
  });

  test("includeEmpty дээр ч эрэмбэ тогтмол", () => {
    // Бүх суваг гарахаа больсон тул TRAFFIC_ORDER-ийн ДЭД дараалал
    // мөн эсэхийг шалгана — байрлал нь хугацаа болгонд тогтмол байх
    // ёстой, эс тэгвэл хоёр тайланг нүдээр жишиж чадахгүй.
    const out = classifyTraffic(real, { includeEmpty: true }).map((r) => r.key);
    const idx = out.map((k) => TRAFFIC_ORDER.indexOf(k));
    assert.ok(idx.every((v) => v >= 0), "танихгүй түлхүүр");
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  });

  test("эрэмбэ тогтмол", () => {
    const out = classifyTraffic(real);
    const idx = out.map((r) => TRAFFIC_ORDER.indexOf(r.key));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  });
});
