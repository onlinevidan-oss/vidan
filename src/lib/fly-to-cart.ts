/**
 * "Сагс руу нисэх" хөдөлгөөн.
 *
 * ЗОРИЛГО: бараа сагсанд ОРЛОО гэдгийг нүдээр баталгаажуулах. Зөвхөн
 * тоо өөрчлөгдвөл хэрэглэгч анзаардаггүй — ялангуяа гар утсанд сагсны
 * товч дэлгэцийн дээд буланд, хуруунаас хол байдаг.
 *
 * Хэрэгжүүлэлт: барааны зургийг хуулж, байрлалаар нь түр элемент
 * үүсгээд сагсны товч руу нисгэнэ. Web Animations API — нэмэлт сан
 * шаардахгүй, GPU дээр ажиллана.
 *
 * ⚠️ Энэ нь ЧИМЭГЛЭЛ. Алдаа гарвал, бай олдоогүй, эсвэл хэрэглэгч
 * хөдөлгөөн багасгахыг хүссэн бол чимээгүй өнгөрнө — сагсанд нэмэх
 * үйлдэл нь үүнээс ХАМААРАХГҮЙ.
 */

/** Сагсны товчийг олоход ашиглах тэмдэг (CartButton дээр тавигдсан) */
export const CART_TARGET_ATTR = "data-cart-target";

const DURATION_MS = 700;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * `source` элементийг сагсны товч руу нисгэнэ.
 * @param source Ихэвчлэн барааны зургийн элемент
 */
export function flyToCart(source: Element | null | undefined): void {
  try {
    if (!source || typeof document === "undefined") return;
    if (prefersReducedMotion()) return;
    // Web Animations API-гүй хуучин браузерт алгасна
    if (typeof Element.prototype.animate !== "function") return;

    const target = document.querySelector(`[${CART_TARGET_ATTR}]`);
    if (!target) return;

    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    // Дэлгэцэнд харагдахгүй байвал нисгэх утгагүй
    if (from.width === 0 || to.width === 0) return;

    const ghost = buildGhost(source, from);
    if (!ghost) return;
    document.body.appendChild(ghost);

    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    // Сагсны товч руу багасаж орох харьцаа
    const scale = Math.max(0.12, Math.min(to.width / from.width, 0.5));

    const anim = ghost.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        {
          // Дээш бага зэрэг сэхээд унах нуман зам — шулуун шугамаас
          // илүү анзаарагддаг
          transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(${
            (1 + scale) / 2
          })`,
          opacity: 0.95,
          offset: 0.55,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
          opacity: 0.25,
        },
      ],
      {
        duration: DURATION_MS,
        easing: "cubic-bezier(.45,.05,.55,.95)",
        fill: "forwards",
      },
    );

    const cleanup = () => ghost.remove();
    anim.addEventListener("finish", cleanup);
    anim.addEventListener("cancel", cleanup);
    // Анимаци ямар нэг шалтгаанаар дуусгавар болохгүй бол ч элемент
    // дэлгэц дээр үүрд үлдэж болохгүй
    setTimeout(cleanup, DURATION_MS + 400);
  } catch {
    // Чимэглэл — худалдан авалтыг хэзээ ч тасалдуулахгүй
  }
}

/** Нисэх хуулбарыг бэлдэнэ — зураг байвал зураг, үгүй бол дугуй толбо */
function buildGhost(source: Element, box: DOMRect): HTMLElement | null {
  const img = source instanceof HTMLImageElement ? source : source.querySelector("img");

  const ghost = document.createElement("div");
  ghost.style.position = "fixed";
  ghost.style.left = `${box.left}px`;
  ghost.style.top = `${box.top}px`;
  ghost.style.width = `${box.width}px`;
  ghost.style.height = `${box.height}px`;
  ghost.style.zIndex = "60";
  ghost.style.pointerEvents = "none";
  ghost.style.willChange = "transform, opacity";

  if (img instanceof HTMLImageElement && img.currentSrc) {
    const clone = document.createElement("img");
    clone.src = img.currentSrc;
    clone.alt = "";
    clone.style.width = "100%";
    clone.style.height = "100%";
    clone.style.objectFit = "contain";
    clone.style.borderRadius = "12px";
    ghost.appendChild(clone);
  } else {
    // Зураггүй бараа — брэндийн өнгөт дугуй
    ghost.style.borderRadius = "9999px";
    ghost.style.background = "var(--color-brand-600, #d72327)";
    ghost.style.opacity = "0.85";
  }

  return ghost;
}
