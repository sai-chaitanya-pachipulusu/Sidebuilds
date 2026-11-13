export const buyerBriefFields = [
  { key: 'included_assets', label: 'What is included?', placeholder: 'Source code, domain, design files, documentation. Mention anything excluded.', question: 'What assets are included in the sale, and what is excluded?', askLabel: 'Ask about included assets' },
  { key: 'running_costs', label: 'What does it cost to run?', placeholder: 'Hosting, database and paid services. Include currency, billing period and any free-tier limits.', question: 'What are the monthly running costs, including paid services and free-tier limits?', askLabel: 'Ask about running costs' },
  { key: 'setup_handoff', label: 'How will the next owner get started?', placeholder: 'Setup steps, accounts to create, known limitations and the support you will provide.', question: 'What setup steps and handover support are included?', askLabel: 'Ask about handover' }
];

export const briefText = value => typeof value === 'string' ? value.trim() : Array.isArray(value) ? value.filter(item => typeof item === 'string').join(', ').trim() : '';

export function listingChecklist(project) {
  const details = project.stage_details || {};
  return [
    { id: 'description', label: 'Explain the project', done: Boolean(briefText(project.name) && briefText(project.description)) },
    { id: 'category', label: 'Choose a category', done: Boolean(briefText(project.category)) },
    { id: 'tech_stack', label: 'Name the technologies', done: Boolean(briefText(project.tech_stack)) },
    { id: 'demo_url', label: 'Add a demo or repository', done: Boolean(briefText(project.demo_url) || briefText(project.github_url)) },
    ...buyerBriefFields.map(field => ({ id: `brief-${field.key}`, label: field.label, done: Boolean(briefText(details[field.key])) }))
  ];
}
