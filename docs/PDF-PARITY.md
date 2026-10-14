# Native PDF evidence

V1 is tagged `v1-final` at `76978c4fbe56658b8b856cb7218b5c4a212cd1f0`. Its real generators were executed from a detached worktree using shared fictional fixtures and a frozen date. The 17 original PDFs are in `tests/golden/v1/`; manifest records the original template SHA-256 values.

Native S-21/S-3-E/S-88-E and emergency generators are dependency-injected modules; no old window singleton, HTML iframe or V1 runtime is involved. Print & PDF lazy-loads the engine, supports a merged publisher batch with progress/cancellation, selected people, service year, live PDF preview, download, print and file sharing. Schedule documents include a real large-print option. Month-grid overview cards preserve full assignment details on following pages when a card overflows. A5 booklets pad to a multiple of four logical pages and impose front/back spreads for short-edge duplex printing. Six schedule-format fixtures verify that no assignment text is lost.

## Intentional font change requiring owner review

The first direct native port matched every rendered reference exactly. S-21 continues to match exactly with embedded Noto Sans. V1's S-3/S-88/emergency Latin overlays used unembedded Helvetica and depended on the reader's substitution. Native documents embed metric-compatible Nimbus fonts; this makes rendering portable and changes glyph outlines and text bounding-box descriptors. The original text positions, wrapping and page counts are retained. Templates are byte-identical.

`docs/review-evidence/pdf-parity.json` records actual deltas, not an identical-image claim. At 800-pixel page rendering: S-21 tolerance 0.01 pt and 0.1% changed pixels; embedded-Latin descriptor tolerance 1.5 pt and 8% changed pixels. Emergency fixtures measured up to 1.152 pt descriptor difference and 6.586% changed pixels. The broader image threshold is specifically for this documented font replacement; it is not evidence that arbitrary template movement is acceptable. Owner visual review of this change is still required. Extracted text is identical per page across all 17 fixtures.

All fonts used by all 17 generated PDFs are embedded, checked with `pdffonts`. Nimbus conversion source, original outlines and licensing are supplied separately from application source; the PDF font exception permits generated documents. Noto font licenses are included.

## Script coverage

HarfBuzz shapes Devanagari, Malayalam, Tamil, Telugu, Kannada, Gujarati, Bengali and Gurmukhi; embedded Noto fonts cover these scripts. Tests create actual S-21 documents for eight names and a mixed-script schedule, checking selectable extracted names. ActualText spans preserve words through ligatures. This establishes the tested examples, not linguistic correctness for every possible string; community proofreading remains useful.

## Reproduce

Install Poppler utilities, Pillow and NumPy for rendered tests. Run:

```
node scripts/generate-v2-pdf-fixtures.mjs
python scripts/check-pdf-parity.py
node scripts/check-pdf-contract.mjs
node scripts/check-unicode-native-pdf.mjs
npm run build
node scripts/check-pdf-browser.cjs
```

Golden recapture requires the tag worktree and `scripts/capture-v1-pdf-golden.mjs`. Do not recapture goldens to make a failing native result pass. Browser evidence verifies a real download, emergency regeneration offline after first use and zero demo backend requests.
