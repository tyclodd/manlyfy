"""Reproduce the separately licensed local picture decoders; no user media."""
from pathlib import Path
import hashlib
import json
import urllib.request

root = Path(__file__).resolve().parents[1] / 'assets' / 'photo-codecs'
for item in json.loads((root / 'sources.json').read_text()):
    data = urllib.request.urlopen(item['url'], timeout=60).read()
    if hashlib.sha256(data).hexdigest() != item['sha256']:
        raise RuntimeError('Unexpected upstream contents: ' + item['file'])
    if item['adapter'] == 'classic-worker-export':
        data = (b'// MANLYFY adapter: removed the ESM export for importScripts; no decoder changes.\n'
                + data.replace(b'export default buildLibheif',
                               b'// Exported as the buildLibheif worker global.'))
    (root / item['file']).write_bytes(data)
    print(item['file'], len(data))
