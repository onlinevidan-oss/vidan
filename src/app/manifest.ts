import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/**
 * Web App Manifest — гар утсанд "Нүүр дэлгэцэд нэмэх" үед ашиглагдана.
 *
 * theme_color нь хуудасны хамгийн дээд мөр (`bg-brand-700`)-тэй ижил тул
 * хөтчийн дээд хэсэг постертойгоо нийлж харагдана.
 * background_color нь сайтын дэвсгэр (`--color-cream`) — эхлэх дэлгэц
 * ачаалагдах хүртэл ижил өнгөтэй байна.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "VIDAN — Эх орны хөрснөөс таны гарт",
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    lang: "mn",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f0",
    theme_color: "#b81e22",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/vidan-icon.png", sizes: "192x192", type: "image/png" },
    ],
  };
}
