/**
 * Exclusive plates (#buy-exclusive).
 *
 * PROTOTYPE SNAPSHOT from the REG KING Shopify store, 27 Oct 2026: every active plate priced at
 * £15,000 or more (156 plates), with the date each was added. `ours` = tagged "regking-stock".
 * At launch this comes live from Shopify.
 *
 * CONFIRM with REG KING:
 * - which plates belong here. £15,000 and over is a starting rule; a Shopify tag such as
 *   "exclusive" would let REG KING choose plates one by one.
 * - 9 UF: its Shopify handle is "9-dv". Check the listing is right.
 * - HU69 TLE: its Shopify handle is "hu69-ler". Check the listing is right.
 */
import { shop, shopDate } from "./shopData";

export const EXCLUSIVE_SNAPSHOT_DATE = shop ? shopDate(shop.date) : "27 Oct 2026";
export const EXCLUSIVE_FROM = 15000;

export type ExclusivePlate = { reg: string; handle: string; price: number; added: string; ours?: boolean };

/** The saved copy (27 Oct 2026), newest first, as Shopify lists them. */
const savedExclusive: ExclusivePlate[] = [
  { reg: "786 BG", handle: "786-bg", price: 19995, added: "2026-10-27" },
  { reg: "OMA 22R", handle: "oma-22r", price: 15000, added: "2026-10-23" },
  { reg: "Y29 JAV", handle: "y29-jav", price: 20000, added: "2026-10-21" },
  { reg: "D33 MXN", handle: "d33-mxn", price: 50000, added: "2026-10-15" },
  { reg: "S4 MSS", handle: "s4-mss", price: 21000, added: "2026-10-15" },
  { reg: "PH55 TUN", handle: "ph55-tun", price: 15000, added: "2026-10-11" },
  { reg: "JUN 443D", handle: "jun-443d", price: 15000, added: "2026-10-10" },
  { reg: "M155 BHA", handle: "m155-bha", price: 15000, added: "2026-10-05" },
  { reg: "J44 VDM", handle: "j44-vdm", price: 50000, added: "2026-10-02" },
  { reg: "K44 SAM", handle: "k44-sam", price: 15000, added: "2026-09-29" },
  { reg: "18 YX", handle: "18-yx", price: 50000, added: "2026-09-29" },
  { reg: "MA04 RAB", handle: "ma04-rab", price: 15000, added: "2026-09-25" },
  { reg: "S54 MYA", handle: "s54-mya", price: 30000, added: "2026-09-25" },
  { reg: "R3 SWN", handle: "r3-swn", price: 25000, added: "2026-09-25" },
  { reg: "AYZ 7866", handle: "ayz-7866", price: 20000, added: "2026-09-25" },
  { reg: "G71 OST", handle: "g71-ost", price: 15000, added: "2026-09-21" },
  { reg: "X74 LHA", handle: "x74-lha", price: 30000, added: "2026-09-21" },
  { reg: "OEV 11S", handle: "oev-11s", price: 15000, added: "2026-09-21" },
  { reg: "6 HST", handle: "6-hst", price: 18000, added: "2026-09-21" },
  { reg: "1 YSN", handle: "1-ysn", price: 85000, added: "2026-09-16", ours: true },
  { reg: "W4 HED", handle: "w4-hed", price: 23995, added: "2026-09-03" },
  { reg: "G54 MMY", handle: "g54-mmy", price: 25000, added: "2026-08-31" },
  { reg: "X50 MAR", handle: "x50-mar", price: 29000, added: "2026-08-31" },
  { reg: "53 HAM", handle: "53-ham", price: 26000, added: "2026-08-31" },
  { reg: "RU 13", handle: "ru-13", price: 19500, added: "2026-08-31" },
  { reg: "44 RRY", handle: "44-rry", price: 15000, added: "2026-08-31" },
  { reg: "PT18 JAT", handle: "pt18-jat", price: 15000, added: "2026-08-23" },
  { reg: "188 YS", handle: "188-ys", price: 50000, added: "2026-08-13", ours: true },
  { reg: "HU69 TLE", handle: "hu69-ler", price: 20000, added: "2026-08-07" },
  { reg: "YUM 44Y", handle: "yum-44y", price: 15000, added: "2026-07-30" },
  { reg: "H45 ANS", handle: "h45-ans", price: 40000, added: "2026-07-26", ours: true },
  { reg: "VAS 33M", handle: "vas-33m-1", price: 15000, added: "2026-07-10" },
  { reg: "111 BOS", handle: "111-bos", price: 20000, added: "2026-07-10" },
  { reg: "D3 MON", handle: "d3-mon-1", price: 70000, added: "2026-07-05", ours: true },
  { reg: "18 BY", handle: "18-by-2", price: 85000, added: "2026-07-05", ours: true },
  { reg: "MUL 4K", handle: "mul-4k", price: 25000, added: "2026-07-04" },
  { reg: "SMA 13K", handle: "sma-13k", price: 15000, added: "2026-07-04" },
  { reg: "W55 KHN", handle: "w55-khn", price: 15000, added: "2026-07-04" },
  { reg: "Y22 UFX", handle: "y22-ufx", price: 89999, added: "2026-07-04" },
  { reg: "H22 YCH", handle: "h22-ych", price: 25000, added: "2026-07-04" },
  { reg: "F22 TTY", handle: "f22-tty", price: 50000, added: "2026-07-04" },
  { reg: "BO66 YKN", handle: "bo66-ykn", price: 20000, added: "2026-07-04" },
  { reg: "PR04 HKR", handle: "pr04-hkr", price: 50000, added: "2026-06-29" },
  { reg: "UN74 MED", handle: "un74-med", price: 17500, added: "2026-06-07" },
  { reg: "H5 ARM", handle: "h5-arm", price: 15000, added: "2026-05-31" },
  { reg: "W40 AAR", handle: "w40-aar", price: 24500, added: "2026-05-31" },
  { reg: "YOU 554F", handle: "you-554f", price: 78600, added: "2026-05-31" },
  { reg: "USM 22N", handle: "usm-22n", price: 30000, added: "2026-05-31" },
  { reg: "DOR 41D", handle: "dor-41d", price: 30000, added: "2026-05-25" },
  { reg: "BAF 3L", handle: "baf-3l", price: 100000, added: "2026-05-25" },
  { reg: "S1 NCH", handle: "s1-nch", price: 35000, added: "2026-05-21" },
  { reg: "T666 YUB", handle: "t666-yub", price: 20000, added: "2026-05-21" },
  { reg: "W11 HYD", handle: "w11-hyd", price: 16000, added: "2026-04-30" },
  { reg: "P1 AYA", handle: "p1-aya", price: 22000, added: "2026-04-16" },
  { reg: "K110 SLA", handle: "k110-sla", price: 18000, added: "2026-03-30" },
  { reg: "MR11 MMY", handle: "mr11-mmy", price: 20000, added: "2026-03-30" },
  { reg: "MMA 574R", handle: "mma-574r", price: 24999, added: "2026-03-25" },
  { reg: "RS71 CUZ", handle: "rs71-cuz", price: 30000, added: "2026-03-25" },
  { reg: "SVJ 80Y", handle: "svj-80y-1", price: 20000, added: "2026-03-13" },
  { reg: "TU04 KAL", handle: "tu04-kal", price: 20000, added: "2026-03-11" },
  { reg: "TU04 KUL", handle: "tu04-kul", price: 20000, added: "2026-03-11" },
  { reg: "TO04 KAL", handle: "to04-kal", price: 30000, added: "2026-03-11" },
  { reg: "TO04 KUL", handle: "to04-kul", price: 30000, added: "2026-03-11" },
  { reg: "TW04 KAL", handle: "tw04-kal", price: 55000, added: "2026-03-11" },
  { reg: "TW04 KUL", handle: "tw04-kul", price: 55000, added: "2026-03-11" },
  { reg: "BCL 4L", handle: "bcl-4l", price: 28000, added: "2026-03-05" },
  { reg: "TYC 4N", handle: "tyc-4n-2", price: 30000, added: "2026-03-04" },
  { reg: "S666 YAD", handle: "s666-yad", price: 85000, added: "2026-02-12" },
  { reg: "GOA 41S", handle: "goa41s", price: 19995, added: "2026-02-08" },
  { reg: "G63 TRP", handle: "g63-trp", price: 22000, added: "2026-02-08" },
  { reg: "SYE 1D", handle: "n413-mmm-copy", price: 35000, added: "2026-02-03" },
  { reg: "G11 FFY", handle: "r70-llw-copy-1", price: 15000, added: "2026-02-02" },
  { reg: "M4 YBK", handle: "n4-vyh-copy-2", price: 40000, added: "2026-01-27" },
  { reg: "KA51 MMM", handle: "wy55-amg-copy", price: 35000, added: "2026-01-17" },
  { reg: "5 BDY", handle: "5-bdy", price: 17500, added: "2026-01-17", ours: true },
  { reg: "67 RX", handle: "ar20-oss-copy", price: 25000, added: "2025-12-31" },
  { reg: "SHA 771S", handle: "f2-hah-copy-1", price: 20000, added: "2025-12-31" },
  { reg: "SHA 771X", handle: "a91-den-copy", price: 20000, added: "2025-12-31" },
  { reg: "A91 DEN", handle: "w88-wyd-copy", price: 44999, added: "2025-12-31" },
  { reg: "S2 JYX", handle: "s2-jyx", price: 25000, added: "2025-12-27" },
  { reg: "S11 JYX", handle: "s11-jyx", price: 15000, added: "2025-12-27" },
  { reg: "M90 RYH", handle: "m90-ryh", price: 45000, added: "2025-12-27" },
  { reg: "WA51 MSZ", handle: "wa51-msz", price: 50000, added: "2025-12-26" },
  { reg: "ME11 TAL", handle: "me11-tal", price: 20000, added: "2025-12-26" },
  { reg: "WHY 83G", handle: "why-83g", price: 15000, added: "2025-12-14" },
  { reg: "3 KJW", handle: "3-kjw", price: 15995, added: "2025-12-03" },
  { reg: "1 BSX", handle: "1-bsx", price: 25000, added: "2025-11-26" },
  { reg: "PJ14 KJY", handle: "pj14-kjy", price: 20000, added: "2025-11-26" },
  { reg: "YA04 LLA", handle: "ya04-lla", price: 15000, added: "2025-11-26" },
  { reg: "NA74 SHB", handle: "na74-shb", price: 50000, added: "2025-11-20" },
  { reg: "41 KAM", handle: "41-kam", price: 20000, added: "2025-11-13" },
  { reg: "SHA 4B", handle: "sha-4b", price: 25000, added: "2025-11-13" },
  { reg: "TOY 4A", handle: "toy-4a", price: 15000, added: "2025-11-13" },
  { reg: "CEO 8H", handle: "ceo-8h", price: 15000, added: "2025-11-13" },
  { reg: "14 LA", handle: "14-la", price: 50000, added: "2025-11-13" },
  { reg: "CUT 11N", handle: "cut-11n", price: 20000, added: "2025-10-23" },
  { reg: "805 S", handle: "805-s", price: 89500, added: "2025-10-09" },
  { reg: "DDD 14", handle: "ddd-14", price: 15000, added: "2025-10-09" },
  { reg: "SH15 HAX", handle: "gr24-fta", price: 15000, added: "2025-10-09" },
  { reg: "R8 SHD", handle: "r8-shd", price: 15000, added: "2025-10-09" },
  { reg: "95 WM", handle: "95-wm", price: 16000, added: "2025-09-28" },
  { reg: "3 PN", handle: "3-pn", price: 45000, added: "2025-09-18", ours: true },
  { reg: "9 UF", handle: "9-dv", price: 42500, added: "2025-09-18", ours: true },
  { reg: "80 D", handle: "80-d", price: 70000, added: "2025-09-18", ours: true },
  { reg: "D1 EAL", handle: "d1-eal", price: 15000, added: "2025-09-11", ours: true },
  { reg: "7 LX", handle: "7-lx", price: 49999.99, added: "2025-08-28", ours: true },
  { reg: "4 UW", handle: "4-uw", price: 45000, added: "2025-08-13", ours: true },
  { reg: "HA55 XNN", handle: "ha55-xnn", price: 25000, added: "2025-08-06" },
  { reg: "EGG 3R", handle: "egg-3r", price: 15000, added: "2025-07-29" },
  { reg: "AK11 RAM", handle: "ak11-ram", price: 20000, added: "2025-07-29" },
  { reg: "AMJ 17D", handle: "amj-17d", price: 20000, added: "2025-07-17" },
  { reg: "CHA 81D", handle: "cha-81d", price: 25000, added: "2025-07-17" },
  { reg: "D7 UGX", handle: "d7-ugx", price: 15000, added: "2025-07-03" },
  { reg: "CE08 OSS", handle: "ce08-oss", price: 15000, added: "2025-06-24" },
  { reg: "DH25 LON", handle: "dh25-lon", price: 16000, added: "2025-06-18" },
  { reg: "20 DO", handle: "20-do", price: 20000, added: "2025-06-11", ours: true },
  { reg: "MON 3Y", handle: "mon-3y", price: 95000, added: "2025-06-11", ours: true },
  { reg: "MRK 451M", handle: "mrk-451m", price: 15000, added: "2025-06-04" },
  { reg: "FK11 TTT", handle: "fk11-ttt", price: 15000, added: "2025-06-04" },
  { reg: "S111 RDY", handle: "s111-rdy", price: 50000, added: "2025-05-27" },
  { reg: "MH04 MED", handle: "mh04-med", price: 22000, added: "2025-05-12" },
  { reg: "OO04 YAN", handle: "oo04-yan", price: 20000, added: "2025-05-04" },
  { reg: "OU71 AWZ", handle: "ou71-awz", price: 30000, added: "2025-04-24" },
  { reg: "4 OCS", handle: "4-ocs", price: 20000, added: "2025-04-16" },
  { reg: "XK19 NGX", handle: "xk19-ngx", price: 29990, added: "2025-04-16" },
  { reg: "XH19 NNA", handle: "xh19-nna", price: 19990, added: "2025-04-16" },
  { reg: "G6 ULL", handle: "g6-ull", price: 15000, added: "2025-04-12" },
  { reg: "GOF 455T", handle: "gof-455t", price: 16000, added: "2025-04-12" },
  { reg: "124 JA", handle: "124-ja", price: 65000, added: "2025-04-10", ours: true },
  { reg: "705 H", handle: "705h", price: 70000, added: "2025-04-07" },
  { reg: "HU51 ENZ", handle: "hu51-enz", price: 25000, added: "2025-04-02" },
  { reg: "HA11 MZA", handle: "ha11-mza", price: 30000, added: "2025-03-20" },
  { reg: "D9 DDY", handle: "d9-ddy", price: 195000, added: "2025-03-17" },
  { reg: "GBO 5S", handle: "gbo-5s", price: 15000, added: "2025-03-12", ours: true },
  { reg: "M888 SFE", handle: "m888-sfe", price: 15000, added: "2025-03-10" },
  { reg: "GH05 TUX", handle: "gh05-tux", price: 15000, added: "2025-03-10" },
  { reg: "19 SAJ", handle: "19-saj", price: 35000, added: "2025-03-10" },
  { reg: "FAH 33D", handle: "fah33-d", price: 20000, added: "2025-03-06" },
  { reg: "AL17 RJA", handle: "al17-rja", price: 19995, added: "2025-02-24" },
  { reg: "J44 TEU", handle: "j44-teu", price: 15000, added: "2025-02-22" },
  { reg: "KAS 4D", handle: "kas4-d", price: 30000, added: "2025-02-16" },
  { reg: "77 HN", handle: "77-hn", price: 15000, added: "2025-02-13" },
  { reg: "LUV 53X", handle: "luv-53x", price: 16000, added: "2025-02-02" },
  { reg: "FOR 53X", handle: "for-53x", price: 16000, added: "2025-02-02" },
  { reg: "CAL 14N", handle: "cal-14n", price: 19950, added: "2025-02-02" },
  { reg: "RPL 1", handle: "rpl-1", price: 200000, added: "2025-02-01" },
  { reg: "WH05 EMO", handle: "wh05-emo", price: 50000, added: "2025-01-28" },
  { reg: "SA70 AMS", handle: "sa70-ams", price: 100000, added: "2025-01-22" },
  { reg: "SAJ 80Y", handle: "saj-80y", price: 16000, added: "2025-01-21" },
  { reg: "RAJ 44B", handle: "raj-44b", price: 40000, added: "2025-01-19" },
  { reg: "BA55 TUM", handle: "ba55-tum-1", price: 30000, added: "2024-12-27" },
  { reg: "K1 NGA", handle: "k1-nga", price: 35000, added: "2024-12-27" },
  { reg: "NB12 PAK", handle: "nb12-pak", price: 25000, added: "2024-12-24" },
  { reg: "13 RSB", handle: "13-rsb", price: 20000, added: "2024-12-13" },
  { reg: "F1 SPA", handle: "f1-spa", price: 20000, added: "2024-11-14" },
  { reg: "H5 SXN", handle: "h5-sxn", price: 15000, added: "2024-10-19" },
];

/** Exclusive plates: live from Shopify at the last build when synced, otherwise the saved copy. */
export const exclusive: ExclusivePlate[] = shop
  ? shop.plates.filter((p) => p.price >= EXCLUSIVE_FROM).map((p) => ({ reg: p.reg, handle: p.handle, price: p.price, added: p.added, ...(p.ours ? { ours: true } : {}) }))
  : savedExclusive;

/** Characters on the plate, not counting the space. */
export const charCount = (reg: string) => reg.replace(/[^A-Z0-9]/gi, "").length;

export type ExclusiveCat = "2" | "3" | "4" | "5" | "other";
export const EXCLUSIVE_CATS: { key: ExclusiveCat; label: string }[] = [
  { key: "2", label: "2 Characters" },
  { key: "3", label: "3 Characters" },
  { key: "4", label: "4 Characters" },
  { key: "5", label: "5 Characters" },
  { key: "other", label: "Other Exclusive Plates" },
];
export const catOf = (reg: string): ExclusiveCat => {
  const n = charCount(reg);
  return n >= 2 && n <= 5 ? (String(n) as ExclusiveCat) : "other";
};

/** How many plates count as new in stock. */
export const NEW_IN_STOCK = 6;
