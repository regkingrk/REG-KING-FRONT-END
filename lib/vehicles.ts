/**
 * Vehicle makes and models for the surround order (what the customer drives). Order information only:
 * choosing a make never puts its logo on a surround. Models are the current and recent UK line-ups;
 * every make also has "Other / not listed", where the customer types their model.
 */
export const OTHER_MODEL = "Other / not listed";

export const VEHICLES: Record<string, string[]> = {
  Abarth: ["500", "595", "695", "124 Spider"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale", "Junior", "Giulietta", "MiTo", "4C"],
  "Aston Martin": ["DB11", "DB12", "DBS", "DBX", "Vantage", "Vanquish", "Rapide"],
  Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "e-tron GT", "TT", "R8", "S3", "S4", "S5", "RS3", "RS4", "RS5", "RS6", "RS7", "RS Q8", "SQ5", "SQ7", "SQ8"],
  Bentley: ["Bentayga", "Continental GT", "Continental GTC", "Flying Spur", "Mulsanne"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "XM", "Z4", "i3", "i4", "i5", "i7", "iX", "iX1", "iX3", "M2", "M3", "M4", "M5", "M8", "X3 M", "X5 M", "X6 M"],
  BYD: ["Atto 2", "Atto 3", "Dolphin", "Seal", "Seal U", "Sealion 7"],
  Chevrolet: ["Camaro", "Corvette", "Silverado"],
  Citroën: ["C1", "C3", "C3 Aircross", "C4", "C4 X", "C5 Aircross", "C5 X", "Berlingo", "Dispatch", "Relay"],
  Cupra: ["Born", "Formentor", "Leon", "Ateca", "Tavascan", "Terramar"],
  Dacia: ["Sandero", "Sandero Stepway", "Duster", "Jogger", "Spring", "Bigster"],
  Dodge: ["Challenger", "Charger", "Durango", "RAM"],
  Ferrari: ["296", "812", "F8", "Roma", "Portofino", "SF90", "Purosangue", "12Cilindri", "488", "458"],
  Fiat: ["500", "500X", "600", "Panda", "Tipo", "Doblo", "Ducato"],
  Ford: ["Fiesta", "Focus", "Puma", "Kuga", "Mustang", "Mustang Mach-E", "Explorer", "Ranger", "Transit", "Transit Custom", "Transit Connect", "Tourneo", "Galaxy", "S-Max", "Mondeo", "EcoSport", "Ka"],
  Honda: ["Jazz", "Civic", "Civic Type R", "HR-V", "ZR-V", "CR-V", "e:Ny1", "Honda e", "NSX"],
  Hyundai: ["i10", "i20", "i30", "i30 N", "Bayon", "Kona", "Tucson", "Santa Fe", "Ioniq 5", "Ioniq 5 N", "Ioniq 6", "Inster"],
  Jaguar: ["E-Pace", "F-Pace", "I-Pace", "F-Type", "XE", "XF", "XJ"],
  Jeep: ["Avenger", "Renegade", "Compass", "Wrangler", "Grand Cherokee"],
  Kia: ["Picanto", "Rio", "Ceed", "ProCeed", "XCeed", "Stonic", "Niro", "Sportage", "Sorento", "EV3", "EV6", "EV9", "Stinger"],
  Lamborghini: ["Huracán", "Urus", "Revuelto", "Aventador", "Temerario"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque"],
  Lexus: ["CT", "IS", "ES", "LS", "UX", "NX", "RX", "RZ", "LBX", "LC"],
  Lotus: ["Emira", "Eletre", "Emeya", "Evora", "Exige", "Elise"],
  Maserati: ["Ghibli", "Levante", "Quattroporte", "Grecale", "MC20", "GranTurismo"],
  Mazda: ["Mazda2", "Mazda3", "Mazda6", "CX-30", "CX-5", "CX-60", "CX-80", "MX-5", "MX-30"],
  McLaren: ["Artura", "750S", "720S", "GT", "GTS", "570S"],
  "Mercedes-Benz": ["A-Class", "B-Class", "C-Class", "CLA", "CLS", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "EQA", "EQB", "EQC", "EQE", "EQS", "SL", "AMG GT", "V-Class", "Vito", "Sprinter", "A 45", "C 63", "E 63"],
  MG: ["MG3", "MG4", "MG5", "ZS", "HS", "Cyberster", "MG S5"],
  Mini: ["Hatch", "Convertible", "Clubman", "Countryman", "Aceman", "Cooper S", "John Cooper Works"],
  Mitsubishi: ["ASX", "Eclipse Cross", "Outlander", "L200", "Mirage"],
  Nissan: ["Micra", "Juke", "Qashqai", "X-Trail", "Ariya", "Leaf", "Navara", "GT-R", "370Z", "Z"],
  Peugeot: ["108", "208", "2008", "308", "3008", "408", "508", "5008", "Partner", "Expert", "Boxer"],
  Polestar: ["Polestar 2", "Polestar 3", "Polestar 4"],
  Porsche: ["911", "718 Cayman", "718 Boxster", "Taycan", "Panamera", "Macan", "Cayenne"],
  Renault: ["Clio", "Captur", "Megane", "Austral", "Arkana", "Scenic", "Symbioz", "Zoe", "Renault 5", "Trafic", "Master"],
  "Rolls-Royce": ["Ghost", "Phantom", "Cullinan", "Wraith", "Dawn", "Spectre"],
  SEAT: ["Ibiza", "Arona", "Leon", "Ateca", "Tarraco"],
  Skoda: ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq", "Enyaq", "Elroq"],
  smart: ["fortwo", "#1", "#3"],
  Subaru: ["Impreza", "XV", "Crosstrek", "Forester", "Outback", "BRZ", "Solterra"],
  Suzuki: ["Ignis", "Swift", "Vitara", "S-Cross", "Jimny", "Swace", "Across"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
  Toyota: ["Aygo X", "Yaris", "Yaris Cross", "GR Yaris", "Corolla", "C-HR", "RAV4", "bZ4X", "Prius", "Supra", "GR86", "Land Cruiser", "Hilux", "Proace"],
  Vauxhall: ["Corsa", "Astra", "Mokka", "Frontera", "Grandland", "Crossland", "Insignia", "Combo", "Vivaro", "Movano"],
  Volkswagen: ["Polo", "Golf", "Golf GTI", "Golf R", "T-Cross", "T-Roc", "Taigo", "Tiguan", "Touareg", "Passat", "Arteon", "ID.3", "ID.4", "ID.5", "ID.7", "ID. Buzz", "Up", "Transporter", "Caddy", "Amarok"],
  Volvo: ["EX30", "EX40", "EX90", "XC40", "XC60", "XC90", "S60", "S90", "V60", "V90"],
};

export const VEHICLE_MAKES = Object.keys(VEHICLES).sort((a, b) => a.localeCompare(b));
export const modelsFor = (make: string) => [...(VEHICLES[make] ?? []), OTHER_MODEL];
