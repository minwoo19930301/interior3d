import { normalizeObject, roundNumber } from './objectCatalog';

const SCENE_QUERY_KEY = 'scene';

function hasWindow() {
  return typeof window !== 'undefined';
}

function encodeBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = `${padded}${'='.repeat((4 - (padded.length % 4 || 4)) % 4)}`;
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function compactObject(object) {
  return {
    t: object.type,
    p: object.position.map((value) => roundNumber(value, 2)),
    r: object.rotation.map((value) => roundNumber(value, 3)),
    d: object.dimensions.map((value) => roundNumber(value, 2)),
    c: object.color,
    x: object.isOpen ? 1 : 0,
    s: object.swing,
  };
}

export function serializeScene({ objects, unitSystem }) {
  return encodeBase64Url(
    JSON.stringify({
      v: 1,
      u: unitSystem === 'cm' ? 'cm' : 'm',
      o: objects.map(compactObject),
    }),
  );
}

export function parseSceneParam(rawScene) {
  if (!rawScene) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(rawScene));

    if (!Array.isArray(payload.o)) {
      return null;
    }

    return {
      unitSystem: payload.u === 'cm' ? 'cm' : 'm',
      objects: payload.o.map((item) =>
        normalizeObject({
          type: item.t,
          position: item.p,
          rotation: item.r,
          dimensions: item.d,
          color: item.c,
          isOpen: Boolean(item.x),
          swing: item.s,
        }),
      ),
    };
  } catch {
    return null;
  }
}

export function loadSceneFromUrl() {
  if (!hasWindow()) {
    return null;
  }

  const url = new URL(window.location.href);
  return parseSceneParam(url.searchParams.get(SCENE_QUERY_KEY));
}

export function buildSceneUrl({ objects, unitSystem }) {
  if (!hasWindow()) {
    return '';
  }

  const url = new URL(window.location.href);

  if (objects.length === 0 && unitSystem !== 'cm') {
    url.searchParams.delete(SCENE_QUERY_KEY);
  } else {
    url.searchParams.set(
      SCENE_QUERY_KEY,
      serializeScene({ objects, unitSystem }),
    );
  }

  return url.toString();
}

export function syncSceneToUrl(sceneState) {
  if (!hasWindow()) {
    return;
  }

  const nextUrl = buildSceneUrl(sceneState);

  if (nextUrl && nextUrl !== window.location.href) {
    window.history.replaceState({}, '', nextUrl);
  }
}
