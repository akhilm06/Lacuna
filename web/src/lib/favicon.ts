export const LACUNA_FAVICON_PATH = "/lacuna-mark.svg";

const FAVICON_VERSION = 1;

export function lacunaFaviconHref(): string {
  return `${LACUNA_FAVICON_PATH}?v=${FAVICON_VERSION}`;
}
