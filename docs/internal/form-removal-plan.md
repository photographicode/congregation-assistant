# Original-export replacement plan

The previous entry page contained S21_TEMPLATE_B64, S3_TEMPLATE_B64 and S88_TEMPLATE_B64. buildS21OriginalPdf loaded/embedded the first; buildS3OriginalPdf loaded the second; ui.printS88 loaded the third. PdfTools supplied fonts, fitting and marks; it did not itself load these templates. The service worker cached index.html, and therefore previously cached the embedded artwork.

Replacement: record-exports.js creates new A4 documents with PDFDocument.create, bundled Noto Sans, original layouts/headings and a two-line independent-software footer. Publisher cards use landscape A4 with a new metadata hierarchy and activity table. Monthly attendance uses portrait A4, one weekly grid and a counted-session summary. Yearly attendance uses landscape A4, one page per service year and a combined monthly table. Long information continues on additional A4 pages rather than disappearing.

Old internal function/button identifiers are temporarily retained only for compatibility with stored state and automation. User-facing labels and filenames identify the original exports. There is no user-form upload feature, official artwork or template-loading path. Historical Git commits still contain previous source; history rewriting needs a separate approved fresh-clone plan.

Deployment must bump the public-shell cache and replace root/staging together. Old files already downloaded, or older offline clients, cannot be recalled. These layouts still need actual printer and local-language acceptance; this is not legal certification.
