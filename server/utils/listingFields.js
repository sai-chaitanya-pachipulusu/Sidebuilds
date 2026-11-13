const xss = require('xss');
const stages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];
const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
const text = (value, field, maximum) => {
  if (typeof value !== 'string' || value.length > maximum) invalid(`${field} must be text of at most ${maximum} characters.`);
  return xss(value.trim());
};
function list(value, field) {
  if (value === null || value === '') return [];
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = value.split(','); }
  }
  if (!Array.isArray(value) || value.length > 30) invalid(`${field} must contain at most 30 items.`);
  const unique = new Map();
  for (const item of value) {
    const clean = text(item, field, 80);
    if (clean) unique.set(clean.toLowerCase(), unique.get(clean.toLowerCase()) || clean);
  }
  return [...unique.values()];
}
function details(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 30) {
    invalid('stage_details must be an object with at most 30 fields.');
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9_]{0,49}$/.test(key) || ['constructor', 'prototype'].includes(key)) invalid('Invalid stage detail field.');
    if (Array.isArray(entry)) {
      if (entry.length > 30) invalid(`stage_details.${key} must contain at most 30 items.`);
      result[key] = entry.map(item => text(item, `stage_details.${key}`, 2000));
    } else result[key] = text(entry, `stage_details.${key}`, 2000);
  }
  if (JSON.stringify(result).length > 20000) invalid('Stage details exceed 20,000 characters.');
  return result;
}
function normalizeListingFields(body) {
  const fields = {};
  if (body.stage !== undefined) {
    if (typeof body.stage !== 'string' || !stages.includes(body.stage.trim().toLowerCase())) invalid('Invalid project stage.');
    fields.stage = body.stage.trim().toLowerCase();
  }
  for (const field of ['category', 'subcategory']) {
    if (body[field] !== undefined) fields[field] = body[field] === null ? null : text(body[field], field, 50);
  }
  for (const field of ['tags', 'tech_stack']) {
    if (body[field] !== undefined) fields[field] = JSON.stringify(list(body[field], field));
  }
  if (body.stage_details !== undefined) fields.stage_details = JSON.stringify(details(body.stage_details));
  return fields;
}
function deserializeListing(project) {
  if (!project) return project;
  let stageDetails = project.stage_details;
  if (typeof stageDetails === 'string') {
    try { stageDetails = JSON.parse(stageDetails); } catch { stageDetails = {}; }
  }
  const result = { ...project, stage_details: stageDetails && typeof stageDetails === 'object' && !Array.isArray(stageDetails) ? stageDetails : {} };
  for (const field of ['tags', 'tech_stack']) {
    try { result[field] = list(project[field], field); } catch { result[field] = []; }
  }
  return result;
}
module.exports = { normalizeListingFields, deserializeListing };
