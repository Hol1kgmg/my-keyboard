import data from "./keys.json";

export const keys = data;
export type KeyDefinition = (typeof keys)[number];
export const keyById = new Map(keys.map((key) => [key.id, key]));
export const keyByCode = new Map(
  keys.flatMap((key) => key.codes.map((code) => [code, key] as const)),
);
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
