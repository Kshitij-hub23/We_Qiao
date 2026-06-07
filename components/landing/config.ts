/**
 * Landing-page configuration (namespaced; independent of the main app's lib/).
 *
 * Inside the integrated app the landing lives at /landing, and every
 * "See Live Demo ->" CTA returns to the main app's login screen. This is an
 * internal route, so a plain absolute path is correct, a full nav (not client
 * routing) is intended, so the app shell mounts fresh at /login.
 */
export const APP_LOGIN_URL = "/login";

/** Footer placeholders, confirm before the pitch. */
export const CONTACT_EMAIL = "hello@qiao.health";
export const REPO_URL = "https://github.com/team-qiao/qiao";
