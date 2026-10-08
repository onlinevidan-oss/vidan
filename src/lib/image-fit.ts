/**
 * Барааны зургийг дэлгүүрийн жишигт оруулах тооцоо — цэвэр функцууд.
 *
 * Жишиг (байгаа зургуудаас хэмжсэн): дөрвөлжин, дэвсгэр цэвэр цагаан,
 * бараа өндрийн ~90%-ийг эзэлж төвлөрнө. Карт нь зургийг `object-contain`
 * -оор харуулж савлагааны хэмжээгээр масштаблдаг тул өөр харьцаатай эсвэл
 * өнгөт дэвсгэртэй зураг бусад бараанаас тод ялгарч харагдана.
 *
 * Пикселтэй ажиллах хэсэг нь энд, canvas-тай ажиллах хэсэг нь
 * `image-normalize.ts`-д — ингэснээр тооцоог браузергүйгээр тестлэнэ.
 */

/** Гаралтын зургийн тал (px) */
export const IMAGE_SIZE = 870;
/** Бараа зургийн талын хэдэн хувийг эзлэх вэ */
export const IMAGE_FILL = 0.9;

/** R, G, B гурвуулаа үүнээс дээш бол "цагаан" (JPEG-ийн шуугианыг уучилна) */
const WHITE_MIN = 240;
/** Ирмэгийн пикселийн хэдэн хувь нь цагаан байвал дэвсгэрийг цагаан гэж үзэх вэ */
const WHITE_EDGE_RATIO = 0.9;

type Pixels = ArrayLike<number>;

/** Хүрээ — right/bottom нь сүүлийн пикселийн ДАРААГИЙН байрлал (exclusive) */
export type Bounds = { left: number; top: number; right: number; bottom: number };

function isWhite(data: Pixels, i: number): boolean {
  return (
    data[i] >= WHITE_MIN && data[i + 1] >= WHITE_MIN && data[i + 2] >= WHITE_MIN
  );
}

/**
 * Дэвсгэр цагаан уу? — зургийн гадна хүрээний пикселүүдээр шалгана.
 * Бараа нэг ирмэгт бага зэрэг тулсан байж болох тул бүгд биш, ихэнх нь
 * цагаан байхыг шаардана.
 */
export function hasWhiteBackground(
  data: Pixels,
  width: number,
  height: number,
): boolean {
  if (width < 2 || height < 2) return false;
  let white = 0;
  let total = 0;
  const check = (x: number, y: number) => {
    total++;
    if (isWhite(data, (y * width + x) * 4)) white++;
  };
  for (let x = 0; x < width; x++) {
    check(x, 0);
    check(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    check(0, y);
    check(width - 1, y);
  }
  return white / total >= WHITE_EDGE_RATIO;
}

/** Цагаан биш пикселүүдийн хүрээ. Зураг бүхэлдээ цагаан бол null. */
export function contentBounds(
  data: Pixels,
  width: number,
  height: number,
): Bounds | null {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isWhite(data, (y * width + x) * 4)) continue;
      if (x < left) left = x;
      if (x + 1 > right) right = x + 1;
      if (y < top) top = y;
      if (y + 1 > bottom) bottom = y + 1;
    }
  }
  return right > left && bottom > top ? { left, top, right, bottom } : null;
}

/**
 * Агуулгыг дөрвөлжин зураас дээр төвлүүлж байрлуулах тооцоо.
 * Урт талаар нь `fill` хувьд тааруулна — өндөр нарийн лонх өндрөөрөө,
 * хавтгай өргөн сав өргөнөөрөө хязгаарлагдана. Харьцаа хадгалагдана.
 */
export function fitPlacement(
  content: { width: number; height: number },
  size: number = IMAGE_SIZE,
  fill: number = IMAGE_FILL,
): { x: number; y: number; width: number; height: number } {
  const scale = (size * fill) / Math.max(content.width, content.height);
  const width = Math.round(content.width * scale);
  const height = Math.round(content.height * scale);
  return {
    x: Math.round((size - width) / 2),
    y: Math.round((size - height) / 2),
    width,
    height,
  };
}
