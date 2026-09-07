import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { readDraft } from '../lib/draftStorage';
import { ProjectFileError, readProjectFile, serializeProject } from '../lib/projectFiles';
import { getBrowserLocale, t } from '../lib/i18n';
import './ProjectDialog.css';

export default function ProjectDialog({ onClose, saveStatus }) {
  const locale = getBrowserLocale();
  const dialogRef = useRef(null);
  const readSequence = useRef(0);
  const [pending, setPending] = useState(null);
  const [fileStatus, setFileStatus] = useState('idle');
  const [error, setError] = useState(null);
  const draft = readDraft();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      readSequence.current += 1;
      dialog.close();
      opener?.focus();
    };
  }, []);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    // Allow selecting the same file again after a failed or cancelled preview.
    event.target.value = '';
    if (!file) return;
    const sequence = ++readSequence.current;
    setPending(null);
    setError(null);
    setFileStatus('reading');
    try {
      const scene = await readProjectFile(file);
      if (sequence !== readSequence.current) return;
      setPending({ scene, name: file.name });
      setFileStatus('idle');
    } catch (error) {
      if (sequence !== readSequence.current) return;
      setError(error instanceof ProjectFileError ? error.code : 'invalid');
      setFileStatus('idle');
    }
  };

  const download = () => {
    setError(null);
    try {
      const text = serializeProject(useStore.getState());
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interior3d-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFileStatus('downloaded');
    } catch (error) {
      setError(error instanceof ProjectFileError ? error.code : 'download');
    }
  };

  const load = (scene) => {
    try {
      useStore.getState().loadProject(scene);
      onClose();
    } catch (error) {
      setError(error instanceof ProjectFileError ? error.code : 'invalid');
    }
  };

  const restoreDraft = () => {
    const latest = readDraft();
    if (!latest.scene) {
      setError('draft');
      return;
    }
    load(latest.scene);
  };

  return (
    <dialog ref={dialogRef} className="project-dialog" onCancel={onClose} aria-labelledby="project-title">
      <header>
        <h2 id="project-title">{t('project_title', locale)}</h2>
        <button type="button" onClick={onClose} aria-label={t('ui_close', locale)}>{t('ui_close', locale)}</button>
      </header>
      <p className="project-intro">{t('project_intro', locale)}</p>

      <section aria-labelledby="project-files-title">
        <h3 id="project-files-title">{t('project_files', locale)}</h3>
        <div className="project-actions">
          <button type="button" onClick={download}>{t('project_download', locale)}</button>
          <label className="project-file-label">
            {t('project_choose_file', locale)}
            <input type="file" accept=".json,application/json" onChange={handleFile} aria-label={t('project_choose_file', locale)} />
          </label>
        </div>
        <p className="project-help">{t('project_file_help', locale)}</p>
        {fileStatus === 'reading' && <p role="status">{t('project_reading', locale)}</p>}
        {fileStatus === 'downloaded' && <p role="status">{t('project_downloaded', locale)}</p>}
        {pending && (
          <div className="project-preview">
            <strong>{pending.name}</strong>
            <p>{pending.scene.objects.length} {t('ui_items', locale)} · {pending.scene.unitSystem}</p>
            <p>{t('project_replace_help', locale)}</p>
            <div className="project-actions">
              <button type="button" onClick={() => load(pending.scene)}>{t('project_replace', locale)}</button>
              <button type="button" onClick={() => setPending(null)}>{t('ui_cancel', locale)}</button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="project-draft-title">
        <h3 id="project-draft-title">{t('project_draft', locale)}</h3>
        <p role="status" className="project-save-status">{t(`project_save_${saveStatus.status}`, locale)}</p>
        <p className="project-help">{t('project_draft_help', locale)}</p>
        {draft.scene && <p>{new Date(draft.savedAt).toLocaleString(locale)} · {draft.scene.objects.length} {t('ui_items', locale)} · {draft.scene.unitSystem}</p>}
        <button type="button" disabled={!draft.scene} onClick={restoreDraft}>{t('project_restore', locale)}</button>
        <p className="project-help">{t('project_replace_help', locale)}</p>
      </section>
      {error && <p role="alert" className="project-error">{t(`project_error_${error}`, locale)}</p>}
    </dialog>
  );
}
