/**
 * Gallery photos. Real stills from REG KING's own workshop clips (28 Oct 2026), in public/gallery/.
 * `src: null` is a placeholder tile until REG KING sends more photos. Never fill these with stock
 * or AI-made car pictures.
 */
export type GalleryTab = "cars" | "made";
export type Photo = { src: string | null; alt: string };

export const GALLERY: Record<GalleryTab, { label: string; line: string; photos: Photo[] }> = {
  cars: {
    label: "Plates on cars",
    line: "Customers' cars wearing plates bought or made through REG KING.",
    photos: [
      { src: "gallery/car-mercedes.jpg", alt: "A REG KING plate being fitted to the back of a Mercedes" },
      { src: null, alt: "" },
      { src: null, alt: "" },
      { src: null, alt: "" },
      { src: null, alt: "" },
      { src: null, alt: "" },
    ],
  },
  made: {
    label: "Plates we've made",
    line: "Made at our HQ in Bilston: printed, 3D gel, 4D and more.",
    photos: [
      { src: "gallery/made-s555-ufs.jpg", alt: "Finished yellow S555 UFS rear plate on the workbench" },
      { src: "gallery/made-9600-d.jpg", alt: "9600 D plate coming out of the plate printer" },
      { src: "gallery/made-s555-ufs-gel.jpg", alt: "S555 UFS front plate being made in the spacing jig" },
      { src: "gallery/made-yellow-gel.jpg", alt: "A finished yellow rear plate held up in the workshop" },
      { src: "gallery/made-m5.jpg", alt: "An M5 plate on the press in the workshop" },
      { src: "gallery/made-letters.jpg", alt: "Letters being laid into the spacing jig" },
    ],
  },
};
