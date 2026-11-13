import { openExternalUrl, sanitizeUrl } from '../../utils/security';

describe('URL security helpers', () => {
  test.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd'
  ])('rejects dangerous URL scheme %s', (value) => {
    expect(sanitizeUrl(value)).toBe('');
  });

  test('normalizes safe external and same-origin URLs', () => {
    expect(sanitizeUrl('example.com/path')).toBe('https://example.com/path');
    expect(sanitizeUrl('/api/files/preview/123')).toBe('/api/files/preview/123');
  });

  test('opens safe URLs without an opener and blocks unsafe URLs', () => {
    const openedWindow = { opener: window };
    window.open = jest.fn(() => openedWindow);

    expect(openExternalUrl('https://example.com')).toBe(true);
    expect(window.open).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
    expect(openedWindow.opener).toBeNull();

    window.open.mockClear();
    expect(openExternalUrl('javascript:alert(1)')).toBe(false);
    expect(window.open).not.toHaveBeenCalled();
  });
});
