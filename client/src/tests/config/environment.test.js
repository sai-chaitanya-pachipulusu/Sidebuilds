import { config } from '../../config/environment';
import { resolveServiceUrl } from '../../config/apiUrl';

describe('environment URL construction', () => {
  test('adds exactly one /api prefix for every endpoint style', () => {
    const dashboard = config.getApiEndpoint('/dashboard');
    const scoring = config.getApiEndpoint('/api/ai/score-project');

    expect(dashboard).toMatch(/\/api\/dashboard$/);
    expect(scoring).toMatch(/\/api\/ai\/score-project$/);
    expect(dashboard).not.toContain('/api/api/');
    expect(scoring).not.toContain('/api/api/');
  });

  test('maps the unresolved legacy API hostname to the active service', () => {
    expect(resolveServiceUrl('https://api.sidebuilds.online/api', 'http://localhost:5002/api'))
      .toBe('https://sidebuilds.onrender.com/api');
  });
});
