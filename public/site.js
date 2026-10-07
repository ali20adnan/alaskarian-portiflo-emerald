// Aggregate counts only; no tracking cookies or visitor identifiers.
if (!new URLSearchParams(location.search).has('preview')) {
  function record(kind, linkId) {
    const body = JSON.stringify({ kind, linkId });
    if (!navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))) {
      fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  }
  record('view');
  document.querySelectorAll('[data-link-id]').forEach(link => {
    link.addEventListener('click', () => record('click', link.dataset.linkId));
    link.addEventListener('auxclick', event => { if (event.button === 1) record('click', link.dataset.linkId); });
  });
}
