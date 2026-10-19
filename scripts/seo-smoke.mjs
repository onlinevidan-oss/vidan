import assert from "node:assert/strict";

const base = process.env.SEO_BASE_URL || "http://localhost:3100";

async function html(route) {
  const response = await fetch(`${base}${route}`);
  assert.equal(response.status, 200, `${route} must return 200`);
  return response.text();
}

function canonical(document) {
  return [...document.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((match) => match[1]);
}

for (const [route, expected] of [
  ["/", "https://www.vidan.mn"],
  ["/products/alimhan-alimny-nuhash-180g", "https://www.vidan.mn/products/alimhan-alimny-nuhash-180g"],
  ["/brands/vidan", "https://www.vidan.mn/brands/vidan"],
  ["/categories/nuhash", "https://www.vidan.mn/categories/nuhash"],
  ["/privacy", "https://www.vidan.mn/privacy"],
]) {
  const document = await html(route);
  assert.deepEqual(canonical(document), [expected], `${route} must have one canonical`);
}

const sortedProducts = await html("/products?sort=price-asc");
assert.match(sortedProducts, /<meta name="robots" content="noindex, follow"/);
assert.deepEqual(canonical(sortedProducts), ["https://www.vidan.mn/products"]);

for (const route of ["/cart", "/login"]) {
  const document = await html(route);
  assert.match(document, /<meta name="robots" content="noindex, nofollow"/, `${route} must be noindex`);
}

const product = await html("/products/alimhan-alimny-nuhash-180g");
const jsonLd = [...product.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
const productSchema = jsonLd.find((entry) => entry["@type"] === "Product");
assert(productSchema, "Product JSON-LD must exist");
assert.equal(productSchema.offers.priceCurrency, "MNT");
assert(productSchema.offers.price > 0);
assert(jsonLd.some((entry) => entry["@type"] === "BreadcrumbList"));
// Хуурамч үнэлгээ ("★ 4.8 · 150+ үнэлгээ") эргэж орохоос сэргийлнэ.
// Зүгээр /4\.8/ гэж шалгаж болохгүй — updated_at цагийн тэмдэгт (…T02:37:04.894…)
// санамсаргүй таарч, худал дохио өгдөг. Үнэлгээний системгүй тул "үнэлгээ"
// гэдэг үг өөрөө л хангалттай тэмдэг.
assert(!/үнэлгээ/.test(product), "fabricated rating must not be rendered");

const sitemap = await html("/sitemap.xml");
for (const route of ["/brands/vidan", "/categories/nuhash", "/privacy"]) {
  assert(sitemap.includes(`<loc>https://www.vidan.mn${route}</loc>`), `${route} must be in sitemap`);
}

const manifest = await (await fetch(`${base}/manifest.webmanifest`)).json();
assert.equal(manifest.start_url, "/", "manifest must start at root");
assert(manifest.icons.length > 0, "manifest must declare icons");
assert.match(await html("/"), /<meta name="theme-color" content="#b81e22"/);

// Постер хэлбэрийн слайд (гарчиггүй) хоосон alt-тай үлдэж болохгүй
const home = await html("/");
const heroAlts = [...home.matchAll(/<img[^>]*class="[^"]*object-center[^"]*"[^>]*>/g)]
  .map((match) => /alt="([^"]*)"/.exec(match[0])?.[1] ?? "");
assert(heroAlts.length > 0, "hero slides must render");
assert(heroAlts.every((alt) => alt.trim() !== ""), "every hero slide needs alt text");

console.log("SEO smoke checks passed");
