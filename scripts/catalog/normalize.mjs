// Shared text helpers for the catalog pipeline.

export function fold(str) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Tags that only describe the release, never the song. Removed from the display title.
const RELEASE_TAG =
  /\b(remaster(ed)?|remasterizad[oa]|album version|single version|radio (version|edit)|single edit|edit|mono|stereo|(new )?stereo mix|\d{4} mix|digital(ly)? remaster(ed)?|explicit( version)?|clean( version)?|main version|original( version| mix)?|versi[oó]n \d{4}|vers[aã]o remasterizada|#1's edit|from .*|de la pel[ií]cula .*|edici[oó]n aniversario|(\d+\w* )?anniversary (version|edition|mix)|bonus track)\b/i;

// Versions that do not sound like the canonical recording.
const BAD_VERSION =
  /\b(live|en vivo|ao vivo|vivo en|en directo|las ventas|unplugged|ac[uú]stic[oa]?|acoustic|karaoke|instrumental|dubstep|demo|re-?recorded|regrabad[oa]|sped up|slowed|8d|piano version|orchestra|philharmonic|sinf[oó]nic[oa]|symphonic|take \d|alternate|extended|12" version|dance mix|club mix|interlude|directo|a capp?ella|blend)\b/i;

const REMIX = /\bremix\b/i;

// Earlier imports dropped the brackets, leaving tags glued to the end of the title.
const TRAILING_RELEASE =
  /\s+[-–]?\s*(remasterizad[oa]|remastered|remaster|album version|single version|radio edit|radio version|explicit version|mono|stereo|(\d+\w* )?anniversary (version|edition|mix))(\s+\d{4})?\s*$/i;
const TRAILING_LIVE = /\s(live|en vivo|ao vivo|unplugged|medley|(\p{L}+\s){0,4}gira \d{4})\s*$/iu;
// Alternative arrangements ("Versión Salsa") are kept only when no original exists.
const ALT_VERSION =
  /\s*[\(\[-]?\s*versi[oó]n (salsa|urbana|reggae|cancionera|mariachi|banda|ac[uú]stica|pop|rock|cumbia|bachata|norteña|sinf[oó]nica|en español|english)[^\)\]]*[\)\]]?/iu;
const LIVE_ALBUM =
  /(\ben vivo\b|\blive (at|in|from)\b|\(live\)|\bunplugged\b|\bmtv\b|\bconcierto\b|\ben directo\b|\bao vivo\b|\bgira\b|\blive \d{4}|desde bellas artes)/i;

function stripTrailing(title) {
  let out = title;
  for (let i = 0; i < 3; i++) out = out.replace(TRAILING_RELEASE, "");
  return out;
}

export function isLiveAlbum(album = "") {
  return LIVE_ALBUM.test(album);
}

export function isAltVersion(title) {
  return ALT_VERSION.test(title);
}

// Text left after the last bracket ("Felicidad (Margherita) 7" Version") is a version tag too.
const AFTER_BRACKET = /[\)\]]\s+([^\(\)\[\]]+)$/;

function tagsOf(title) {
  const tags = [];
  const after = title.match(AFTER_BRACKET);
  if (after) tags.push(after[1]);
  title.replace(/[\(\[]([^\)\]]*)[\)\]]/g, (_, t) => {
    tags.push(t);
    return "";
  });
  const dash = title.match(/\s[-–]\s(.+)$/);
  if (dash) tags.push(dash[1]);
  return tags;
}

export function isBadVersion(title) {
  if (TRAILING_LIVE.test(stripTrailing(title))) return true;
  return tagsOf(title).some((t) => BAD_VERSION.test(t)) || BAD_VERSION.test(title.replace(/^[^(\[-]*/, ""));
}

export function isRemix(title) {
  return (
    tagsOf(title).some((t) => REMIX.test(t) || /\bmix\b|\d+" version/i.test(t)) ||
    /\s(remix|mix)( version)?$/i.test(title) ||
    isAltVersion(title)
  );
}

/** Title shown to players: drops remaster/edit/version noise, keeps feat. and meaningful subtitles. */
export function displayTitle(title) {
  let out = stripTrailing(title).replace(/\s*[\(\[]([^\)\]]*)[\)\]]/g, (whole, t) => {
    const parts = t.split(/[;\/]/).map((p) => p.trim());
    return parts.every((p) => RELEASE_TAG.test(p) || /^\d{4}$/.test(p)) ? "" : whole;
  });
  out = out.replace(/\s[-–]\s(.+)$/, (whole, t) => (RELEASE_TAG.test(t) || /^\d{4}/.test(t) ? "" : whole));
  return out.replace(/\s{2,}/g, " ").trim();
}

/** Identity of a song regardless of version: no brackets, no dash suffix, no feat., no punctuation. */
export function songKey(title) {
  return fold(stripTrailing(title).replace(ALT_VERSION, " ").replace(AFTER_BRACKET, ")"))
    .replace(/\s(remix|mix)( version)?$/, " ")
    .replace(/[\(\[][^\)\]]*[\)\]]/g, " ")
    .replace(/\s[-–]\s.*$/, " ")
    .replace(/\b(feat|ft|with|con)\.?\s.*$/, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9ñ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function artistKey(artist) {
  return fold(artist).replace(/[^a-z0-9ñ]/g, "");
}
