export const LOG = '[Scribble]';

// Gates the PERF / SIZE / per-action diagnostic logs. Errors (`console.error`)
// and user-facing `alert`s are never gated. Flip on while developing.
export const DEBUG = false;
export function dlog(...args: any[]): void {
  if (DEBUG) console.log(...args);
}

// Logged at each action start to confirm which build is actually live: pushing a
// new .snplg doesn't always replace the running one. Bump per deploy.
export const BUILD_TAG = 'dev';

export const PLUGIN_BUTTON_NAME = 'Scribble';
export const PLUGIN_MENU_ID = 200;

// SDK element type codes (from getElements / getLassoElements).
export const ELEMENT_TYPES = {
  STROKE: 0,
  TITLE: 100,
  PICTURE: 200,
  TEXT: 500,
  TEXT_DIGEST_QUOTE: 501,
  TEXT_DIGEST_CREATE: 502,
  LINK: 600,
  GEO: 700,
};
