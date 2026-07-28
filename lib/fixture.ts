import type { GroceryItem, ItemVote, VoteValue } from "./voting";

const voters = {
  liam: { userId: "liam", displayName: "Liam Hitchcock" },
  anele: { userId: "anele", displayName: "Anele Moyo" },
  jess: { userId: "jess", displayName: "Jess Naidoo" },
  sam: { userId: "sam", displayName: "Sam Nkosi" },
};

function votes(
  entries: Array<[keyof typeof voters, VoteValue]>,
): ItemVote[] {
  return entries.map(([name, value]) => ({ ...voters[name], value }));
}

export const currentUser = {
  id: voters.liam.userId,
  email: "liam.hitchcock@theodo.com",
  displayName: voters.liam.displayName,
  role: "admin" as const,
};

export const initialItems: GroceryItem[] = [
  {
    id: "naartjies",
    name: "Naartjies",
    priceCents: 7_000,
    productUrl:
      "https://www.checkers.co.za/product/tango-fruit-seedless-mandarins-18kg-10607407EA",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:00:00.000Z",
    createdBy: "Anele Moyo",
    votes: votes([
      ["liam", 1],
      ["anele", 1],
      ["jess", 1],
      ["sam", 1],
    ]),
  },
  {
    id: "peanut-bars",
    name: "Peanut butter bars",
    priceCents: 34_999,
    productUrl:
      "https://www.checkers.co.za/product/jungle-peanut-butter-energy-bar-30-x-47g-10500055PK1",
    previewImageUrl:
      "https://www.shopritecashandcarry.co.za/medias/300Wx300H-checkers1200Wx1200H-medias-10500055PK1-en-shopriteGlobalProductCatalog-20250515025736.png?context=bWFzdGVyfGltYWdlc3wxMzM1Mzl8aW1hZ2UvcG5nfGFESTRMMmhoWkM4eE5ETTVOakF4TkRFNU9EZ3hOQzh6TURCWGVETXdNRWhmWTJobFkydGxjbk14TWpBd1YzZ3hNakF3U0Y5dFpXUnBZWE5mTVRBMU1EQXdOVFZRU3pGZlpXNWZjMmh2Y0hKcGRHVkhiRzlpWVd4UWNtOWtkV04wUTJGMFlXeHZaMTh5TURJMU1EVXhOVEF5TlRjek5pNXdibWN8NDQ2Y2Y4ZmU1M2I4OTc2NGQ2MjJlZTgyMWI4ZjhkOTI1NmRkOTM2ZTJmNDY4MGUxZWY1MmMwYmU1ZjlkNmZhOQ",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:01:00.000Z",
    createdBy: "Sam Nkosi",
    votes: votes([
      ["liam", 1],
      ["anele", 1],
      ["jess", 1],
      ["sam", 1],
    ]),
  },
  {
    id: "nachos",
    name: "Nachos x2",
    priceCents: 10_000,
    productUrl:
      "https://www.checkers.co.za/product/mexicorn-cajun-barbeque-flavoured-nachos-250g-10224653EA",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:02:00.000Z",
    createdBy: "Jess Naidoo",
    votes: votes([
      ["liam", 1],
      ["anele", 1],
      ["jess", 1],
      ["sam", 1],
    ]),
  },
  {
    id: "milk",
    name: "Milk x2",
    priceCents: 6_600,
    productUrl:
      "https://www.checkers.co.za/product/clover-fresh-full-cream-milk-2l-10136729EA",
    purchaseType: "recurring",
    locked: true,
    skipped: false,
    createdAt: "2026-07-20T08:03:00.000Z",
    createdBy: "Liam Hitchcock",
    votes: [],
  },
  {
    id: "mango",
    name: "Dried mango slices",
    priceCents: 19_000,
    productUrl:
      "https://www.checkers.co.za/product/padkos-mango-slices-550g-10819910EA",
    previewImageUrl:
      "https://www.shopritecashandcarry.co.za/medias/300Wx300H-checkers1200Wx1200H-10819910EA.webp?context=bWFzdGVyfGltYWdlc3w2NDA0fGltYWdlL3dlYnB8YURrMUwyaG1OeTh4TXpVMk9UUXlPRFU0TmpVeU5pOHpNREJYZURNd01FaGZZMmhsWTJ0bGNuTXhNakF3VjNneE1qQXdTRjh4TURneE9Ua3hNRVZCTG5kbFluQXw4MDc0YWY5OWFkOGZkZTlmZjNkZGQ0ZWVkMDNkNDNlYzFjMzBiYjA0OTE3N2Q3ZDJmNTYxYTU2MzE2N2E2MTc3",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:04:00.000Z",
    createdBy: "Anele Moyo",
    votes: votes([
      ["liam", 1],
      ["anele", 1],
      ["jess", 1],
    ]),
  },
  {
    id: "cookies",
    name: "Choc chip cookies",
    priceCents: 4_000,
    productUrl:
      "https://www.checkers.co.za/product/ticklemouse-country-fare-choc-chip-cookies-240g-10408021EA",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:05:00.000Z",
    createdBy: "Sam Nkosi",
    votes: votes([
      ["liam", 1],
      ["anele", 1],
      ["sam", 1],
    ]),
  },
  {
    id: "pears",
    name: "Dried pears",
    priceCents: 3_499,
    productUrl:
      "https://www.checkers.co.za/product/padkos-dried-pears-200g-10481128EA",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:06:00.000Z",
    createdBy: "Jess Naidoo",
    votes: votes([
      ["liam", 1],
      ["jess", 1],
      ["sam", 1],
    ]),
  },
  {
    id: "droewors",
    name: "Droëwors 400g",
    priceCents: 20_000,
    productUrl:
      "https://www.checkers.co.za/product/kalahari-biltong-beef-droewors-100g-10155410EA",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:07:00.000Z",
    createdBy: "Anele Moyo",
    votes: votes([
      ["anele", 1],
      ["jess", 1],
      ["sam", 1],
    ]),
  },
  {
    id: "milk-tart",
    name: "Whole milk tart",
    priceCents: 10_499,
    productUrl:
      "https://www.checkers.co.za/product/the-bakery-baked-milk-tart-950g-10600741EA",
    purchaseType: "one_off",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:08:00.000Z",
    createdBy: "Sam Nkosi",
    votes: votes([
      ["liam", 1],
      ["anele", 1],
      ["sam", 1],
    ]),
  },
  {
    id: "hummus",
    name: "Hummus x2",
    priceCents: 12_000,
    productUrl:
      "https://www.checkers.co.za/product/deli-hummus-300g-10915086EA",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-20T08:09:00.000Z",
    createdBy: "Jess Naidoo",
    votes: [],
  },
  {
    id: "sunlight",
    name: "Dishwashing liquid x2",
    priceCents: 6_500,
    productUrl:
      "https://www.checkers.co.za/product/sunlight-original-dishwashing-liquid-750ml-10126901EA",
    previewImageUrl:
      "https://www.shopritecashandcarry.co.za/medias/300Wx300H-checkers1200Wx1200H-10126901EA.png?context=bWFzdGVyfGltYWdlc3w0OTU5OHxpbWFnZS9wbmd8YUdWbUwyZzBZaTh4TkRVd01EYzBNelV4TWpBNU5DOHpNREJYZURNd01FaGZZMmhsWTJ0bGNuTXhNakF3VjNneE1qQXdTRjh4TURFeU5qa3dNVVZCTG5CdVp3fDc1ZWMwZjIyYThiYjg2ODhlMjBhNWE1MGYyOTAzOWVhNGExMWE1YTcyYjAzMTk5OGIzNDczODQ4N2YzMDE3Mzg",
    purchaseType: "one_off",
    locked: false,
    skipped: true,
    createdAt: "2026-07-20T08:10:00.000Z",
    createdBy: "Liam Hitchcock",
    votes: [],
  },
];
