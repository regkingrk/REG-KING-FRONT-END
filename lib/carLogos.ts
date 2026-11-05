/**
 * Car brand logos for surround panels, from REG KING's own artwork folder ("Car Logo's" on Drive).
 * Saved in public/logos as transparent webp. One-colour logos are kept as a white shape and drawn in
 * the colour the customer picks; full-colour badges (Quadrifoglio, the Audi S and RS) keep their colours.
 *
 * Licensing: manufacturer logos are trade marks. Confirm REG KING may make and sell them before launch.
 */
export type CarLogo = { key: string; make: string; name: string; w: number; h: number; fullColour?: boolean };

export const CAR_LOGOS: CarLogo[] = [
  { key: "abarth-wordmark", make: "Abarth", name: "Abarth", w: 640, h: 83 },
  { key: "abarth-scorpion", make: "Abarth", name: "Scorpion", w: 530, h: 639 },
  { key: "abarth-595", make: "Abarth", name: "595", w: 151, h: 122 },
  { key: "abarth-595-competizione", make: "Abarth", name: "595 Competizione", w: 640, h: 324 },
  { key: "alfa-wordmark", make: "Alfa Romeo", name: "Alfa Romeo", w: 640, h: 97 },
  { key: "alfa-quadrifoglio", make: "Alfa Romeo", name: "Quadrifoglio", w: 476, h: 432, fullColour: true },
  { key: "alfa-giulia", make: "Alfa Romeo", name: "Giulia", w: 640, h: 85 },
  { key: "alfa-stelvio", make: "Alfa Romeo", name: "Stelvio", w: 179, h: 27 },
  { key: "alfa-tonale", make: "Alfa Romeo", name: "Tonale", w: 296, h: 59 },
  { key: "alfa-junior", make: "Alfa Romeo", name: "Junior", w: 640, h: 43 },
  { key: "aston-wordmark", make: "Aston Martin", name: "Aston Martin", w: 640, h: 71 },
  { key: "aston-db9", make: "Aston Martin", name: "DB9", w: 508, h: 156 },
  { key: "aston-dbx", make: "Aston Martin", name: "DBX", w: 640, h: 168 },
  { key: "audi-rings", make: "Audi", name: "Four rings", w: 640, h: 226 },
  { key: "audi-wordmark", make: "Audi", name: "Audi", w: 640, h: 172 },
  { key: "audi-logo", make: "Audi", name: "Rings and name", w: 348, h: 218, fullColour: true },
  { key: "audi-quattro", make: "Audi", name: "quattro", w: 640, h: 78 },
  { key: "audi-s", make: "Audi", name: "S badge (black)", w: 640, h: 373, fullColour: true },
  { key: "audi-s-chrome", make: "Audi", name: "S badge (chrome)", w: 640, h: 371, fullColour: true },
  { key: "audi-rs", make: "Audi", name: "RS badge", w: 640, h: 214, fullColour: true },
  { key: "bentley-wordmark", make: "Bentley", name: "Bentley", w: 640, h: 85 },
  { key: "bentley-wings-blue", make: "Bentley", name: "Wings (blue)", w: 640, h: 173, fullColour: true },
  { key: "bentley-wings-and-name", make: "Bentley", name: "Wings and name", w: 400, h: 205, fullColour: true },
  { key: "bmw-m-stripes", make: "BMW", name: "M stripes", w: 640, h: 138 },
  { key: "bmw-roundel", make: "BMW", name: "Roundel", w: 213, h: 213, fullColour: true },
  { key: "bmw-m-colour", make: "BMW", name: "M (colour)", w: 296, h: 111, fullColour: true },
  { key: "byd-byd", make: "BYD", name: "BYD", w: 442, h: 93 },
  { key: "bugatti-eb-and-name", make: "Bugatti", name: "EB and name", w: 548, h: 362 },
  { key: "bugatti-bugatti", make: "Bugatti", name: "Bugatti", w: 640, h: 149 },
  { key: "chery-emblem", make: "Chery", name: "Emblem", w: 600, h: 207 },
  { key: "chery-emblem-and-name", make: "Chery", name: "Emblem and name", w: 640, h: 251, fullColour: true },
  { key: "chevrolet-chevrolet", make: "Chevrolet", name: "Chevrolet", w: 640, h: 67 },
  { key: "chevrolet-bowtie-and-name", make: "Chevrolet", name: "Bowtie and name", w: 640, h: 299 },
  { key: "chevrolet-bowtie-gold", make: "Chevrolet", name: "Bowtie (gold)", w: 522, h: 152, fullColour: true },
  { key: "citroen-chevrons-and-name", make: "Citroën", name: "Chevrons and name", w: 548, h: 390, fullColour: true },
  { key: "citroen-oval-and-name", make: "Citroën", name: "Oval and name", w: 640, h: 625, fullColour: true },
  { key: "citroen-citroen", make: "Citroën", name: "Citroën", w: 640, h: 87 },
  { key: "cupra-mark-and-name", make: "Cupra", name: "Mark and name", w: 296, h: 36 },
  { key: "cupra-cupra", make: "Cupra", name: "Cupra", w: 640, h: 64 },
  { key: "cupra-emblem-and-name", make: "Cupra", name: "Emblem and name", w: 640, h: 421 },
  { key: "cadillac-crest", make: "Cadillac", name: "Crest", w: 640, h: 256, fullColour: true },
  { key: "cadillac-crest-and-script", make: "Cadillac", name: "Crest and script", w: 296, h: 199, fullColour: true },
  { key: "cadillac-wreath-and-crest", make: "Cadillac", name: "Wreath and crest", w: 536, h: 496, fullColour: true },
  { key: "cadillac-script", make: "Cadillac", name: "Script", w: 640, h: 174 },
  { key: "mazda-mazda", make: "Mazda", name: "Mazda", w: 640, h: 128 },
  { key: "polestar-polestar", make: "Polestar", name: "Polestar", w: 640, h: 119 },
  { key: "dacia-badge", make: "Dacia", name: "Badge", w: 296, h: 261, fullColour: true },
  { key: "dacia-dacia", make: "Dacia", name: "Dacia", w: 548, h: 67 },
  { key: "dacia-emblem-and-name", make: "Dacia", name: "Emblem and name", w: 640, h: 204 },
  { key: "dodge-r-t", make: "Dodge", name: "R/T", w: 640, h: 208, fullColour: true },
  { key: "dodge-challenger", make: "Dodge", name: "Challenger", w: 548, h: 33 },
  { key: "dodge-demon", make: "Dodge", name: "Demon", w: 552, h: 640, fullColour: true },
  { key: "dodge-srt-hellcat", make: "Dodge", name: "SRT Hellcat", w: 296, h: 93 },
  { key: "dodge-dodge", make: "Dodge", name: "Dodge", w: 307, h: 46, fullColour: true },
  { key: "dodge-ram", make: "Dodge", name: "Ram", w: 623, h: 640, fullColour: true },
  { key: "dodge-charger", make: "Dodge", name: "Charger", w: 640, h: 53 },
  { key: "ferrari-458-speciale", make: "Ferrari", name: "458 Speciale", w: 437, h: 87 },
  { key: "ferrari-ferrari", make: "Ferrari", name: "Ferrari", w: 640, h: 146 },
  { key: "ferrari-purosangue", make: "Ferrari", name: "Purosangue", w: 640, h: 83 },
  { key: "ferrari-812-superfast", make: "Ferrari", name: "812 Superfast", w: 548, h: 66 },
  { key: "ferrari-tricolore-stripe", make: "Ferrari", name: "Tricolore stripe", w: 640, h: 38, fullColour: true },
  { key: "ferrari-prancing-horse-and-name", make: "Ferrari", name: "Prancing horse and name", w: 602, h: 640 },
  { key: "ferrari-f40", make: "Ferrari", name: "F40", w: 448, h: 194 },
  { key: "ferrari-458-spider", make: "Ferrari", name: "458 Spider", w: 405, h: 81 },
  { key: "ferrari-prancing-horse", make: "Ferrari", name: "Prancing horse", w: 191, h: 264 },
  { key: "ferrari-458-italia", make: "Ferrari", name: "458 Italia", w: 548, h: 97 },
  { key: "fiat-badge", make: "Fiat", name: "Badge", w: 438, h: 438, fullColour: true },
  { key: "fiat-500", make: "Fiat", name: "500", w: 195, h: 60 },
  { key: "fiat-fiat", make: "Fiat", name: "Fiat", w: 548, h: 417 },
  { key: "ford-mustang-pony", make: "Ford", name: "Mustang pony", w: 491, h: 198 },
  { key: "ford-puma", make: "Ford", name: "Puma", w: 423, h: 108 },
  { key: "ford-kuga", make: "Ford", name: "Kuga", w: 640, h: 69 },
  { key: "ford-ford-script", make: "Ford", name: "Ford script", w: 640, h: 253 },
  { key: "ford-mustang", make: "Ford", name: "Mustang", w: 640, h: 56 },
  { key: "ford-transit", make: "Ford", name: "Transit", w: 640, h: 48 },
  { key: "ford-focus", make: "Ford", name: "Focus", w: 178, h: 34 },
  { key: "ford-st", make: "Ford", name: "ST", w: 640, h: 265 },
  { key: "ford-blue-oval", make: "Ford", name: "Blue oval", w: 640, h: 240, fullColour: true },
  { key: "ford-rs", make: "Ford", name: "RS", w: 221, h: 91, fullColour: true },
  { key: "ford-galaxy", make: "Ford", name: "Galaxy", w: 588, h: 168 },
  { key: "ford-raptor", make: "Ford", name: "Raptor", w: 296, h: 57, fullColour: true },
  { key: "ford-ranger", make: "Ford", name: "Ranger", w: 620, h: 110, fullColour: true },
  { key: "ford-ka", make: "Ford", name: "Ka", w: 562, h: 355 },
  { key: "ford-fiesta", make: "Ford", name: "Fiesta", w: 640, h: 168 },
  { key: "ford-ford-performance", make: "Ford", name: "Ford Performance", w: 548, h: 43, fullColour: true },
  { key: "honda-wing-and-name-colour", make: "Honda", name: "Wing and name (colour)", w: 548, h: 398, fullColour: true },
  { key: "honda-type-r", make: "Honda", name: "Type R", w: 403, h: 90, fullColour: true },
  { key: "honda-honda", make: "Honda", name: "Honda", w: 633, h: 85 },
  { key: "honda-h-badge", make: "Honda", name: "H badge", w: 548, h: 446, fullColour: true },
  { key: "honda-wing-and-name", make: "Honda", name: "Wing and name", w: 548, h: 441 },
  { key: "hyundai-n-line", make: "Hyundai", name: "N Line", w: 327, h: 90, fullColour: true },
  { key: "hyundai-hyundai", make: "Hyundai", name: "Hyundai", w: 640, h: 94 },
  { key: "jaecoo-jaecoo-7", make: "Jaecoo", name: "Jaecoo 7", w: 493, h: 100, fullColour: true },
  { key: "jaecoo-jaecoo", make: "Jaecoo", name: "Jaecoo", w: 548, h: 70 },
  { key: "jaecoo-jaecoo-5", make: "Jaecoo", name: "Jaecoo 5", w: 507, h: 127, fullColour: true },
  { key: "jaguar-jaguar-modern", make: "Jaguar", name: "Jaguar (modern)", w: 640, h: 86 },
  { key: "jaguar-leaper-and-name", make: "Jaguar", name: "Leaper and name", w: 441, h: 248, fullColour: true },
  { key: "jaguar-jaguar", make: "Jaguar", name: "Jaguar", w: 640, h: 167 },
  { key: "jeep-wrangler", make: "Jeep", name: "Wrangler", w: 588, h: 56 },
  { key: "jeep-jeep", make: "Jeep", name: "Jeep", w: 297, h: 122 },
  { key: "jeep-grand-cherokee", make: "Jeep", name: "Grand Cherokee", w: 362, h: 78 },
  { key: "jeep-trackhawk", make: "Jeep", name: "Trackhawk", w: 640, h: 444, fullColour: true },
  { key: "kia-oval-red", make: "Kia", name: "Oval (red)", w: 508, h: 260, fullColour: true },
  { key: "kia-kia", make: "Kia", name: "Kia", w: 619, h: 157 },
  { key: "kia-oval-classic", make: "Kia", name: "Oval (classic)", w: 427, h: 401, fullColour: true },
  { key: "koenigsegg-koenigsegg", make: "Koenigsegg", name: "Koenigsegg", w: 402, h: 62 },
  { key: "koenigsegg-ghost", make: "Koenigsegg", name: "Ghost", w: 473, h: 502, fullColour: true },
  { key: "lamborghini-huracan", make: "Lamborghini", name: "Huracán", w: 548, h: 39 },
  { key: "lamborghini-aventador", make: "Lamborghini", name: "Aventador", w: 640, h: 44 },
  { key: "lamborghini-lamborghini-script", make: "Lamborghini", name: "Lamborghini script", w: 512, h: 127 },
  { key: "lamborghini-bull", make: "Lamborghini", name: "Bull", w: 504, h: 640, fullColour: true },
  { key: "lamborghini-urus", make: "Lamborghini", name: "Urus", w: 296, h: 39 },
  { key: "lamborghini-revuelto", make: "Lamborghini", name: "Revuelto", w: 248, h: 40, fullColour: true },
  { key: "lamborghini-sv", make: "Lamborghini", name: "SV", w: 440, h: 103 },
  { key: "lamborghini-svj", make: "Lamborghini", name: "SVJ", w: 600, h: 182, fullColour: true },
  { key: "lamborghini-temerario", make: "Lamborghini", name: "Temerario", w: 612, h: 58 },
  { key: "land-rover-land-rover", make: "Land Rover", name: "Land Rover", w: 332, h: 30 },
  { key: "land-rover-oval", make: "Land Rover", name: "Oval", w: 640, h: 339, fullColour: true },
  { key: "land-rover-defender", make: "Land Rover", name: "Defender", w: 410, h: 48 },
  { key: "lexus-emblem-chrome", make: "Lexus", name: "Emblem (chrome)", w: 640, h: 456, fullColour: true },
  { key: "lexus-emblem-and-name", make: "Lexus", name: "Emblem and name", w: 640, h: 309 },
  { key: "lexus-lexus", make: "Lexus", name: "Lexus", w: 640, h: 83 },
  { key: "lotus-badge", make: "Lotus", name: "Badge", w: 508, h: 508, fullColour: true },
  { key: "lotus-lotus", make: "Lotus", name: "Lotus", w: 296, h: 62 },
  { key: "mg-octagon-red", make: "MG", name: "Octagon (red)", w: 223, h: 223, fullColour: true },
  { key: "mg-octagon", make: "MG", name: "Octagon", w: 640, h: 640 },
  { key: "mini-wings", make: "Mini", name: "Wings", w: 640, h: 282 },
  { key: "mini-s", make: "Mini", name: "S", w: 256, h: 336 },
  { key: "mini-cooper-s", make: "Mini", name: "Cooper S", w: 188, h: 55, fullColour: true },
  { key: "mini-mini", make: "Mini", name: "MINI", w: 640, h: 217 },
  { key: "mitsubishi-three-diamonds", make: "Mitsubishi", name: "Three diamonds", w: 242, h: 208 },
  { key: "mitsubishi-diamonds-and-name", make: "Mitsubishi", name: "Diamonds and name", w: 591, h: 640 },
  { key: "maserati-trident-and-name", make: "Maserati", name: "Trident and name", w: 296, h: 125 },
  { key: "maserati-maserati", make: "Maserati", name: "Maserati", w: 640, h: 65 },
  { key: "mazda-emblem-and-name", make: "Mazda", name: "Emblem and name", w: 238, h: 211 },
  { key: "mazda-emblem", make: "Mazda", name: "Emblem", w: 459, h: 378 },
  { key: "mclaren-mclaren", make: "McLaren", name: "McLaren", w: 640, h: 97, fullColour: true },
  { key: "mclaren-mclaren-spaced", make: "McLaren", name: "McLaren (spaced)", w: 548, h: 49, fullColour: true },
  { key: "mclaren-speedmark", make: "McLaren", name: "Speedmark", w: 640, h: 357 },
  { key: "mercedes-benz-star-chrome", make: "Mercedes-Benz", name: "Star (chrome)", w: 447, h: 447, fullColour: true },
  { key: "mercedes-benz-star-and-name", make: "Mercedes-Benz", name: "Star and name", w: 296, h: 174, fullColour: true },
  { key: "nissan-gt-r", make: "Nissan", name: "GT-R", w: 487, h: 338, fullColour: true },
  { key: "nissan-gt", make: "Nissan", name: "GT", w: 435, h: 89, fullColour: true },
  { key: "nissan-nissan", make: "Nissan", name: "Nissan", w: 258, h: 44 },
  { key: "nissan-emblem", make: "Nissan", name: "Emblem", w: 640, h: 536 },
  { key: "omoda-badge-and-name", make: "Omoda", name: "Badge and name", w: 277, h: 362, fullColour: true },
  { key: "omoda-omoda", make: "Omoda", name: "Omoda", w: 340, h: 50 },
  { key: "peugeot-shield", make: "Peugeot", name: "Shield", w: 426, h: 469, fullColour: true },
  { key: "peugeot-peugeot", make: "Peugeot", name: "Peugeot", w: 640, h: 62 },
  { key: "peugeot-shield-and-name", make: "Peugeot", name: "Shield and name", w: 508, h: 299, fullColour: true },
  { key: "peugeot-lion-chrome", make: "Peugeot", name: "Lion (chrome)", w: 613, h: 640, fullColour: true },
  { key: "polestar-star-and-name", make: "Polestar", name: "Star and name", w: 640, h: 468 },
  { key: "polestar-star", make: "Polestar", name: "Star", w: 291, h: 296 },
  { key: "polestar-name-and-star", make: "Polestar", name: "Name and star", w: 296, h: 71 },
  { key: "porsche-crest-and-name", make: "Porsche", name: "Crest and name", w: 508, h: 259, fullColour: true },
  { key: "porsche-porsche", make: "Porsche", name: "Porsche", w: 508, h: 44 },
  { key: "porsche-crest-and-name-black", make: "Porsche", name: "Crest and name (black)", w: 296, h: 153, fullColour: true },
  { key: "porsche-crest", make: "Porsche", name: "Crest", w: 391, h: 226, fullColour: true },
  { key: "renault-diamond", make: "Renault", name: "Diamond", w: 471, h: 640 },
  { key: "renault-diamond-chrome", make: "Renault", name: "Diamond (chrome)", w: 319, h: 385, fullColour: true },
  { key: "renault-diamond-and-name", make: "Renault", name: "Diamond and name", w: 640, h: 261 },
  { key: "renault-diamond-and-name-chrome", make: "Renault", name: "Diamond and name (chrome)", w: 415, h: 424, fullColour: true },
  { key: "rolls-royce-badge-blue", make: "Rolls-Royce", name: "Badge (blue)", w: 350, h: 571, fullColour: true },
  { key: "rolls-royce-badge", make: "Rolls-Royce", name: "Badge", w: 269, h: 486, fullColour: true },
  { key: "rolls-royce-rr-monogram", make: "Rolls-Royce", name: "RR monogram", w: 331, h: 379 },
  { key: "seat-emblem-and-name", make: "SEAT", name: "Emblem and name", w: 640, h: 509 },
  { key: "seat-emblem-and-name-chrome", make: "SEAT", name: "Emblem and name (chrome)", w: 613, h: 448, fullColour: true },
  { key: "skoda-emblem-and-name-green", make: "Skoda", name: "Emblem and name (green)", w: 271, h: 186, fullColour: true },
  { key: "skoda-emblem-and-name", make: "Skoda", name: "Emblem and name", w: 250, h: 296, fullColour: true },
  { key: "smart-smart", make: "smart", name: "smart", w: 640, h: 170 },
  { key: "smart-emblem-and-name", make: "smart", name: "Emblem and name", w: 297, h: 400 },
  { key: "smart-emblem-chrome", make: "smart", name: "Emblem (chrome)", w: 337, h: 318, fullColour: true },
  { key: "subaru-badge-and-name", make: "Subaru", name: "Badge and name", w: 574, h: 348, fullColour: true },
  { key: "mitsubishi-mitsubishi", make: "Mitsubishi", name: "Mitsubishi", w: 640, h: 68 },
  { key: "subaru-badge", make: "Subaru", name: "Badge", w: 623, h: 343, fullColour: true },
  { key: "subaru-small-badge-and-name", make: "Subaru", name: "Small badge and name", w: 418, h: 444, fullColour: true },
  { key: "suzuki-s-and-name", make: "Suzuki", name: "S and name", w: 296, h: 63, fullColour: true },
  { key: "suzuki-s-and-name-stacked", make: "Suzuki", name: "S and name (stacked)", w: 545, h: 366, fullColour: true },
  { key: "suzuki-s-chrome", make: "Suzuki", name: "S (chrome)", w: 369, h: 369, fullColour: true },
  { key: "tesla-t-and-name", make: "Tesla", name: "T and name", w: 231, h: 296 },
  { key: "tesla-t", make: "Tesla", name: "T", w: 394, h: 377 },
  { key: "tesla-shield", make: "Tesla", name: "Shield", w: 258, h: 306, fullColour: true },
  { key: "tesla-tesla", make: "Tesla", name: "Tesla", w: 432, h: 53 },
  { key: "toyota-emblem-and-name", make: "Toyota", name: "Emblem and name", w: 296, h: 56 },
  { key: "toyota-emblem", make: "Toyota", name: "Emblem", w: 564, h: 369 },
  { key: "volvo-volvo", make: "Volvo", name: "Volvo", w: 640, h: 94 },
  { key: "volvo-iron-mark", make: "Volvo", name: "Iron mark", w: 366, h: 364 },
  { key: "volvo-volvo-spaced", make: "Volvo", name: "Volvo (spaced)", w: 640, h: 56 },
  { key: "volvo-badge-chrome", make: "Volvo", name: "Badge (chrome)", w: 449, h: 397, fullColour: true },
  { key: "volkswagen-volkswagen", make: "Volkswagen", name: "Volkswagen", w: 430, h: 78 },
  { key: "volkswagen-vw-emblem", make: "Volkswagen", name: "VW emblem", w: 308, h: 308 },
  { key: "volkswagen-vw-emblem-chrome", make: "Volkswagen", name: "VW emblem (chrome)", w: 447, h: 447, fullColour: true },
  { key: "vauxhall-griffin-and-name", make: "Vauxhall", name: "Griffin and name", w: 481, h: 332 },
  { key: "vauxhall-griffin-badge", make: "Vauxhall", name: "Griffin badge", w: 447, h: 447, fullColour: true },
  { key: "vauxhall-vauxhall", make: "Vauxhall", name: "Vauxhall", w: 640, h: 79 },
];

export const carLogo = (key: string | null | undefined) => CAR_LOGOS.find((l) => l.key === key) ?? null;
/** Each brand's main badge, shown first (and picked first) in its list. */
const PRIMARY = new Set([
  "ford-blue-oval", "ferrari-prancing-horse", "bmw-roundel", "honda-h-badge", "lamborghini-bull", "mercedes-benz-star-and-name",
  "nissan-emblem", "peugeot-shield", "porsche-crest", "renault-diamond", "toyota-emblem", "volkswagen-vw-emblem",
  "vauxhall-griffin-badge", "volvo-iron-mark", "dodge-dodge", "jeep-jeep", "jaguar-leaper-and-name", "land-rover-oval",
  "lexus-emblem-and-name", "mini-wings", "mazda-emblem", "chevrolet-bowtie-gold", "citroen-chevrons-and-name", "cadillac-crest",
  "dacia-emblem-and-name", "fiat-badge", "tesla-t", "polestar-star", "subaru-badge", "suzuki-s-and-name", "skoda-emblem-and-name",
  "seat-emblem-and-name", "rolls-royce-badge", "smart-emblem-and-name", "bentley-wings-and-name", "mg-octagon-red", "lotus-badge",
  "maserati-trident-and-name", "mitsubishi-three-diamonds", "omoda-badge-and-name", "bugatti-eb-and-name", "cupra-emblem-and-name",
  "chery-emblem-and-name", "kia-kia", "audi-rings",
]);
export const carLogosFor = (make: string) =>
  CAR_LOGOS.filter((l) => l.make === make).sort((a, b) => Number(PRIMARY.has(b.key)) - Number(PRIMARY.has(a.key)));

/** Where the picture is (the single-file preview carries the pictures inline). */
export const carLogoSrc = (key: string) => {
  const path = `/logos/${key}.webp`;
  const inline = typeof window !== "undefined" ? (window as unknown as { __RK_STYLE_IMAGES?: Record<string, string> }).__RK_STYLE_IMAGES : undefined;
  return inline?.[path] ?? path;
};

/** Ask any 3D view on the page to draw again (after a picture has loaded). */
export const askRedraw = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("rk-gl-redraw"));
};

/**
 * Draw a logo onto a canvas for the 3D view: one-colour logos in `colour`, full-colour ones as they are.
 * The canvas is filled when the picture loads; `onReady` is called then.
 */
export function carLogoCanvas(logo: CarLogo, colour: string, onReady: () => void): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  const k = 1024 / Math.max(logo.w, logo.h);
  cv.width = Math.max(2, Math.round(logo.w * k));
  cv.height = Math.max(2, Math.round(logo.h * k));
  const img = new Image();
  img.onload = () => {
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    if (!logo.fullColour) {
      g.globalCompositeOperation = "source-in";
      g.fillStyle = colour;
      g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = "source-over";
    }
    onReady();
  };
  img.src = carLogoSrc(logo.key);
  return cv;
}
