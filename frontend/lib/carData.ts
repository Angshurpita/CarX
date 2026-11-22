/**
 * CarX Master Automotive Catalog Data
 * Comprehensive brand, model, and manufacturing year mappings sourced from Cardekho 15,400+ dataset
 * and contemporary Indian automotive market specifications.
 */

export const POPULAR_BRANDS = [
  "Maruti Suzuki",
  "Hyundai",
  "Tata",
  "Mahindra",
  "Toyota",
  "Kia",
  "Honda",
  "Volkswagen",
  "Skoda",
  "MG",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Jeep",
  "Renault",
  "Ford",
  "Nissan",
  "Volvo",
] as const;

export const ALL_BRANDS = [
  "Audi",
  "BMW",
  "Bentley",
  "Datsun",
  "Ferrari",
  "Force",
  "Ford",
  "Honda",
  "Hyundai",
  "Isuzu",
  "Jaguar",
  "Jeep",
  "Kia",
  "Land Rover",
  "Lexus",
  "MG",
  "Mahindra",
  "Maruti",
  "Maruti Suzuki",
  "Maserati",
  "Mercedes-AMG",
  "Mercedes-Benz",
  "Mini",
  "Nissan",
  "Porsche",
  "Renault",
  "Rolls-Royce",
  "Skoda",
  "Tata",
  "Toyota",
  "Volkswagen",
  "Volvo",
] as const;

export const CAR_MODELS_BY_BRAND: Record<string, string[]> = {
  "Audi": [
    "A4",
    "A6",
    "A8",
    "Q3",
    "Q5",
    "Q7",
    "Q8",
    "e-tron"
  ],
  "BMW": [
    "2 Series Gran Coupe",
    "3",
    "5",
    "6",
    "7",
    "M340i",
    "X1",
    "X3",
    "X4",
    "X5",
    "Z4",
    "i4",
    "iX",
    "iX1"
  ],
  "Bentley": [
    "Continental"
  ],
  "Datsun": [
    "GO",
    "RediGO",
    "redi-GO"
  ],
  "Ferrari": [
    "GTC4Lusso"
  ],
  "Force": [
    "Gurkha"
  ],
  "Ford": [
    "Aspire",
    "Ecosport",
    "Endeavour",
    "Figo",
    "Freestyle"
  ],
  "Honda": [
    "Amaze",
    "CR",
    "CR-V",
    "City",
    "City Hybrid",
    "Civic",
    "Elevate",
    "Jazz",
    "WR-V"
  ],
  "Hyundai": [
    "Alcazar",
    "Aura",
    "Creta",
    "Elantra",
    "Exter",
    "Grand",
    "Ioniq 5",
    "Kona Electric",
    "Santro",
    "Tucson",
    "Venue",
    "Verna",
    "i10",
    "i20"
  ],
  "Isuzu": [
    "D-Max",
    "MUX"
  ],
  "ISUZU": [
    "D-Max",
    "MUX"
  ],
  "Jaguar": [
    "F-PACE",
    "XE",
    "XF"
  ],
  "Jeep": [
    "Compass",
    "Grand Cherokee",
    "Meridian",
    "Wrangler"
  ],
  "Kia": [
    "Carens",
    "Carnival",
    "EV6",
    "Seltos",
    "Sonet"
  ],
  "Land Rover": [
    "Defender",
    "Discovery",
    "Range Rover",
    "Range Rover Evoque",
    "Rover"
  ],
  "Lexus": [
    "ES",
    "NX",
    "RX"
  ],
  "MG": [
    "Astor",
    "Comet EV",
    "Gloster",
    "Hector",
    "Windsor EV",
    "ZS EV"
  ],
  "Mahindra": [
    "Alturas",
    "Bolero",
    "Bolero Neo",
    "KUV",
    "KUV100",
    "Marazzo",
    "Scorpio",
    "Scorpio Classic",
    "Scorpio-N",
    "Thar",
    "Thar Roxx",
    "XUV 3XO",
    "XUV300",
    "XUV500",
    "XUV700"
  ],
  "Maruti": [
    "Alto",
    "Baleno",
    "Brezza",
    "Celerio",
    "Ciaz",
    "Dzire",
    "Dzire LXI",
    "Dzire VXI",
    "Dzire ZXI",
    "Eeco",
    "Ertiga",
    "Fronx",
    "Grand Vitara",
    "Ignis",
    "Jimny",
    "S-Cross",
    "S-Presso",
    "Swift",
    "Swift Dzire",
    "Vitara",
    "Wagon R",
    "WagonR",
    "XL6"
  ],
  "Maruti Suzuki": [
    "Alto",
    "Baleno",
    "Brezza",
    "Celerio",
    "Ciaz",
    "Dzire",
    "Dzire LXI",
    "Dzire VXI",
    "Dzire ZXI",
    "Eeco",
    "Ertiga",
    "Fronx",
    "Grand Vitara",
    "Ignis",
    "Jimny",
    "S-Cross",
    "S-Presso",
    "Swift",
    "Swift Dzire",
    "Vitara",
    "Wagon R",
    "WagonR",
    "XL6"
  ],
  "Maserati": [
    "Ghibli",
    "Quattroporte"
  ],
  "Mercedes-AMG": [
    "C",
    "G 63",
    "GT"
  ],
  "Mercedes-Benz": [
    "A-Class",
    "C-Class",
    "CLS",
    "E-Class",
    "EQE",
    "EQS",
    "GL-Class",
    "GLA",
    "GLB",
    "GLC",
    "GLE",
    "GLS",
    "S-Class"
  ],
  "Mini": [
    "Cooper",
    "Countryman"
  ],
  "Nissan": [
    "Kicks",
    "Magnite",
    "Micra",
    "Sunny",
    "X-Trail"
  ],
  "Porsche": [
    "911",
    "Boxster",
    "Cayenne",
    "Macan",
    "Panamera",
    "Taycan"
  ],
  "Renault": [
    "Captur",
    "Duster",
    "Kiger",
    "KWID",
    "Lodgy",
    "Triber"
  ],
  "Rolls-Royce": [
    "Cullinan",
    "Ghost",
    "Phantom",
    "Spectre"
  ],
  "Skoda": [
    "Kodiaq",
    "Kushaq",
    "Kylaq",
    "Octavia",
    "Rapid",
    "Slavia",
    "Superb"
  ],
  "Tata": [
    "Altroz",
    "Curvv",
    "Harrier",
    "Hexa",
    "Nexon",
    "Nexon EV",
    "Punch",
    "Punch EV",
    "Safari",
    "Sierra",
    "Tiago",
    "Tiago EV",
    "Tigor"
  ],
  "Toyota": [
    "Camry",
    "Corolla",
    "Etios",
    "Fortuner",
    "Glanza",
    "Hilux",
    "Innova",
    "Innova Crysta",
    "Innova Hycross",
    "Land Cruiser",
    "Urban Cruiser",
    "Urban Cruiser Hyryder",
    "Urban Cruiser Taisor",
    "Vellfire",
    "Yaris"
  ],
  "Volkswagen": [
    "Ameo",
    "Passat",
    "Polo",
    "Taigun",
    "Tiguan",
    "Vento",
    "Virtus"
  ],
  "Volvo": [
    "S60",
    "S90",
    "V90",
    "XC40",
    "XC60",
    "XC90",
    "EX40"
  ],
};

// Manufacturing years from 2026 down to 1997 covering the entire Cardekho dataset span
export const MANUFACTURING_YEARS = [
  2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017,
  2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007,
  2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997,
] as const;

/**
 * Returns available models for a given brand name (case-insensitive).
 */
export function getModelsForBrand(brand: string): string[] {
  if (!brand) return [];
  const trimmed = brand.trim();
  if (CAR_MODELS_BY_BRAND[trimmed]) {
    return CAR_MODELS_BY_BRAND[trimmed];
  }
  const low = trimmed.toLowerCase();
  for (const [b, models] of Object.entries(CAR_MODELS_BY_BRAND)) {
    if (b.toLowerCase() === low) {
      return models;
    }
  }
  if (low.includes("maruti")) {
    return CAR_MODELS_BY_BRAND["Maruti Suzuki"] || [];
  }
  return [];
}
