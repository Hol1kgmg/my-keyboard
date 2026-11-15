import data from "./keys.json";

export const keys = data;
export type KeyDefinition = (typeof keys)[number];
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
