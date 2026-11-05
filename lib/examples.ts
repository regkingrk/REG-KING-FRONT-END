/**
 * Real photos of plates REG KING has made, shown next to the live previews so customers can see the
 * finished product. Only REG KING's own work goes here (never stock or AI pictures), and customers'
 * logos only with their OK. Files live in public/examples/.
 */
export type ExamplePhoto = { src: string; alt: string };

export const EXAMPLES: Record<string, ExamplePhoto[]> = {
  "Printed": [
    { src: "examples/printed-1.jpg", alt: "Printed plates, front and rear" },
    { src: "examples/printed-2.jpg", alt: "Printed show plate with custom text along the bottom" },
    { src: "examples/printed-3.jpg", alt: "Printed plates, front and rear" },
    { src: "examples/printed-4.jpg", alt: "Printed front plate" },
    { src: "examples/printed-5.jpg", alt: "Printed front plate" },
    { src: "examples/printed-6.jpg", alt: "Printed plates, front and rear" },
    { src: "examples/printed-7.jpg", alt: "Printed plates, front and rear" },
  ],
  "3D Gel": [
    { src: "examples/gel-1.jpg", alt: "3D gel plates, front and rear" },
    { src: "examples/gel-2.jpg", alt: "3D gel plates, front and rear" },
    { src: "examples/gel-3.jpg", alt: "3D gel plates, front and rear" },
    { src: "examples/gel-4.jpg", alt: "3D gel plates, front and rear" },
    { src: "examples/gel-5.jpg", alt: "3D gel plates, front and rear" },
    { src: "examples/gel-6.jpg", alt: "3D gel plates, front and rear" },
  ],
  "4D 3MM": [
    { src: "examples/4d3-1.jpg", alt: "4D 3mm plates, front and rear" },
    { src: "examples/4d3-2.jpg", alt: "4D 3mm plates, front and rear" },
    { src: "examples/4d3-3.jpg", alt: "4D 3mm plates, front and rear" },
    { src: "examples/4d3-4.jpg", alt: "4D 3mm plates, front and rear" },
    { src: "examples/4d3-5.jpg", alt: "4D 3mm plates, front and rear" },
    { src: "examples/4d3-6.jpg", alt: "4D 3mm plates, front and rear" },
  ],
  "Metal Press Black & White": [
    { src: "examples/metal-bw-1.jpg", alt: "Classic black and white metal pressed plates" },
    { src: "examples/metal-bw-2.jpg", alt: "Classic black and white metal pressed show plates" },
  ],
  "logo:printed": [
    { src: "examples/logo-printed-1.jpg", alt: "Printed logo plate for a car dealer, grey with a red and white logo" },
    { src: "examples/logo-printed-2.jpg", alt: "Printed logo plate for a remapping business, white with a black logo" },
    { src: "examples/logo-printed-3.jpg", alt: "Two printed logo plates for a supercar hire firm, black and silver" },
    { src: "examples/logo-printed-4.jpg", alt: "Printed logo plate for a self drive hire firm, gloss black" },
    { src: "examples/logo-printed-5.jpg", alt: "Printed logo plate for a paint protection film business, gloss black with white lettering" },
  ],
  "logo:acrylic": [
    { src: "examples/logo-4d-1.jpg", alt: "4D logo plate, gloss white with a raised black, grey, white and blue logo" },
    { src: "examples/logo-4d-2.jpg", alt: "4D logo plate, gloss white with a raised black, grey, white and blue logo, close up" },
  ],
  "surrounds": [
    { src: "examples/surround-1.jpg", alt: "White and yellow plates in black framed surrounds, raised white BENTLEY on the tab" },
    { src: "examples/surround-2.jpg", alt: "Yellow plate in a black framed surround, raised gold name and emblems on the tab" },
    { src: "examples/surround-3.jpg", alt: "Gloss black surround, raised gold name and emblems on the tab" },
    { src: "examples/surround-4.jpg", alt: "Pair of gloss black surrounds, raised gold names and emblems on the tabs" },
    { src: "examples/surround-5.jpg", alt: "Carbon-effect surround with raised red T5 TRANSPORTER lettering" },
    { src: "examples/surround-6.jpg", alt: "Gloss black surround, raised white AMG lettering on the tab" },
    { src: "examples/surround-7.jpg", alt: "Gloss black surround on a white backing, raised AMG lettering" },
    { src: "examples/surround-8.jpg", alt: "Gloss black surround on a yellow backing, raised AMG lettering" },
    { src: "examples/surround-9.jpg", alt: "Gloss black surround, raised grey AMG lettering" },
    { src: "examples/surround-10.jpg", alt: "Gloss black surround, raised red and black RS badge" },
    { src: "examples/surround-11.jpg", alt: "Close up of a raised RS badge on a surround tab" },
    { src: "examples/surround-12.jpg", alt: "Carbon-effect tab with a raised red and black RS badge" },
    { src: "examples/surround-13.jpg", alt: "Gloss black surround, raised M badge in the M stripe colours" },
    { src: "examples/surround-14.jpg", alt: "Gloss black surround, raised white GT Line badge" },
  ],
  "size:Hex": [{ src: "examples/hex-1.jpg", alt: "Hex plates on the REG KING showroom wall, standard and upside down" }],
};

export const examplesFor = (key: string | null | undefined) => (key && EXAMPLES[key]) || [];
