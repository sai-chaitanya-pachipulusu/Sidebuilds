import { useEffect, useRef, useState } from 'react';

const TEXT_FIELDS = ['name', 'description', 'stage', 'domain', 'demo_url', 'github_url', 'category', 'subcategory', 'tags', 'sale_price', 'monthly_revenue'];
const draftFields = data => {
  const fields = Object.fromEntries(TEXT_FIELDS.filter(key => typeof data[key] === 'string' || typeof data[key] === 'number').map(key => [key, data[key]]));
  fields.tech_stack = typeof data.tech_stack === 'string' ? data.tech_stack : Array.isArray(data.tech_stack) ? data.tech_stack.filter(value => typeof value === 'string') : [];
  fields.stage_details = data.stage_details && typeof data.stage_details === 'object' && !Array.isArray(data.stage_details)
    ? Object.fromEntries(Object.entries(data.stage_details).filter(([key, value]) => /^[a-z][a-z0-9_]*$/.test(key) && (typeof value === 'string' || (Array.isArray(value) && value.every(item => typeof item === 'string'))))) : {};
  fields.is_public = data.is_public === true;
  fields.is_for_sale = data.is_for_sale === true;
  return fields;
};

// New-project drafts stay on this browser and are scoped to the signed-in account.
// Saved projects always load from the API; local drafts never overwrite them.
export default function useProjectDraft({ userId, enabled, formData, setFormData }) {
  const key = enabled && userId ? `sidebuilds:project-draft:v1:${userId}` : null;
  const [loadedKey, setLoadedKey] = useState(null);
  const [status, setStatus] = useState('');
  const [restored, setRestored] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!key) return;
    finished.current = false;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved?.version === 1 && saved.fields && typeof saved.fields === 'object') {
        setFormData(current => ({ ...current, ...draftFields(saved.fields) }));
        setRestored(true);
      }
    } catch (_) {
      setStatus('Browser draft unavailable. Save a private project to keep your work.');
    }
    setLoadedKey(key);
  }, [key, setFormData]);

  useEffect(() => {
    if (!key || loadedKey !== key || finished.current) return;
    try {
      const fields = draftFields(formData);
      const hasWork = TEXT_FIELDS.some(field => field !== 'stage' && String(fields[field] || '').trim()) || Object.values(fields.stage_details).some(Boolean) || fields.tech_stack.length > 0;
      if (hasWork) {
        localStorage.setItem(key, JSON.stringify({ version: 1, fields }));
        setStatus('Draft saved on this browser');
      } else {
        localStorage.removeItem(key);
        setStatus('Your draft will save on this browser as you type');
      }
    } catch (_) {
      setStatus('Browser draft unavailable. Save a private project to keep your work.');
    }
  }, [key, loadedKey, formData]);

  const clearDraft = () => {
    finished.current = true;
    try { if (key) localStorage.removeItem(key); } catch (_) { /* Saving to the server still succeeds. */ }
  };
  return { status, restored, clearDraft };
}
