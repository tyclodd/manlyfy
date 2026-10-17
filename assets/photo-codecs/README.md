# Local picture compatibility libraries

These files load only when their format/recovery path is needed. They are served by MANLYFY, not a third-party conversion service. No selected file is transmitted. Sources and SHA-256 hashes are pinned in `sources.json`; run `python scripts/vendor-photo-codecs.py` to reproduce them.

| Library | Version | License / use |
| --- | --- | --- |
| jpeg-js | 0.4.4 | BSD-3-Clause; decoder also retains its Apache-2.0 header. JPEG recovery. |
| UPNG.js | 2.1.0 | MIT. PNG recovery. |
| pako | 1.0.11 | MIT/Zlib, included license. Inflate support. |
| UTIF.js | 3.1.0 | MIT. TIFF first-image decoding; includes a Mozilla PDF.js-derived JPEG decoder (Apache-2.0). |
| heic-to libheif build | 1.6.6 | LGPL-3.0 package, using libheif 1.23.6 and libde265 1.0.16 (LGPL). HEIC/HEIF conversion. |
| Mozilla PDF.js | 6.4.299 legacy build | Apache-2.0. First PDF page rendered to a canvas. |

Each license is included beside the library. These third-party libraries are separate from MANLYFY's MIT code. No vendor decoder behavior was changed. The sole libheif adaptation removes its final ESM `export default` statement for use in a disposable classic worker; the original source hash and exact reversible change are in the vendoring script.

## HEIC corresponding source and rebuilding

The original JavaScript source and generated decoder are available in the pinned [heic-to 1.6.6 source package](https://registry.npmjs.org/heic-to/-/heic-to-1.6.6.tgz), also used by `sources.json`. See the included `HEIC-BUILD.md` for compilation instructions. Corresponding native source: [libheif v1.23.6](https://github.com/strukturag/libheif/tree/v1.23.6) and [libde265 v1.0.16](https://github.com/strukturag/libde265/tree/v1.0.16). Use `LIBDE265_VERSION=1.0.16 USE_UNSAFE_EVAL=0 USE_WASM=0` as documented by upstream. The library remains a replaceable standalone file; users may replace it with a compatible modified build. No account or key is needed to access these sources.

JPEG fallback preserves EXIF orientation through MANLYFY's canvas adapter. HEIC container transformations are handled by libheif. Compatibility conversion is limited to 32 megapixels and a 45-second disposable worker. Native decoding permits up to 80 megapixels; all results are capped at a 2560-pixel edge. Animated images use a still frame. PDFs use page 1 only, with no PDF scripting or link actions exposed.
