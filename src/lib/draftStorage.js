import { parseSceneParam } from './sceneUrl.js';
import { parseProject, serializeProject } from './projectFiles.js';

export const DRAFT_STORAGE_KEY = 'interior3d.draft.v1';
export const AUTOSAVE_DELAY = 500;

function browserStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function readDraft(storage) {
  try {
    const target = storage === undefined ? browserStorage() : storage;
    if (!target) return { status: 'unavailable', scene: null };
    const raw = target.getItem(DRAFT_STORAGE_KEY);
    if (raw === null) return { status: 'empty', scene: null };
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.savedAt !== 'string' || !Number.isFinite(Date.parse(draft.savedAt))) {
      return { status: 'invalid', scene: null };
    }
    return { status: 'available', scene: parseProject(draft.project), savedAt: draft.savedAt };
  } catch (error) {
    return { status: error instanceof SyntaxError || error?.name === 'ProjectFileError' ? 'invalid' : 'unavailable', scene: null };
  }
}

export function saveDraft(scene, storage) {
  try {
    const target = storage === undefined ? browserStorage() : storage;
    if (!target) return { status: 'unavailable' };
    const savedAt = new Date().toISOString();
    // Serialize completely before setItem, which is atomic. Failure leaves the
    // last successful draft untouched, including localStorage quota failures.
    const value = JSON.stringify({ savedAt, project: serializeProject(scene) });
    target.setItem(DRAFT_STORAGE_KEY, value);
    return { status: 'saved', savedAt };
  } catch (error) {
    return { status: error?.code === 'too_large' ? 'too_large' : 'unavailable' };
  }
}

export function loadInitialProject({ href, storage } = {}) {
  const draft = readDraft(storage);
  const url = href ?? (typeof window === 'undefined' ? null : window.location.href);
  const shared = url ? parseSceneParam(new URL(url).searchParams.get('scene')) : null;
  return {
    scene: shared ?? draft.scene,
    source: shared ? 'shared' : draft.scene ? 'draft' : 'default',
    draft,
  };
}

export function createDraftAutosave(store, {
  storage,
  onStatus = () => {},
  schedule = setTimeout,
  cancel = clearTimeout,
} = {}) {
  let pending = null;
  let timer;
  const flush = () => {
    cancel(timer);
    timer = undefined;
    if (!pending) return;
    const scene = pending;
    pending = null;
    onStatus(saveDraft(scene, storage));
  };
  // Startup deliberately does not write. Opening a default room or a shared
  // link must not overwrite a saved draft before the user makes an edit.
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.objects === previous.objects && state.unitSystem === previous.unitSystem) return;
    pending = { objects: state.objects, unitSystem: state.unitSystem };
    onStatus({ status: 'saving' });
    cancel(timer);
    timer = schedule(flush, AUTOSAVE_DELAY);
  });
  return { flush, stop() { unsubscribe(); flush(); } };
}
