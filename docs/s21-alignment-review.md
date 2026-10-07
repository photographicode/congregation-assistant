# S-21 alignment correction — 7 October 2026

The original template geometry is preserved. Header values use the measured original label baselines: Name 48.85 pt, birth 63.28 pt, baptism 77.80 pt from the top. Values match the label font size, 10.74 pt. The service year is a bold 9.5 pt en-dash range beneath its original heading.

S-21 now uses bundled Noto Sans for generated values so numeral ink bounds are available for both axes. Text fitting and continuation notes remain. Numeric baselines and x positions use actual glyph-outline bounds; other text retains the existing line-layout rules. The tapered black tick is a filled curve, with the original checkbox outline retained. Other document typography is unchanged.

Independent Poppler raster verification measures all 24 month-study/hour cells plus total hours within 0.5 pt of their cell centres. Fixtures include zeros, decimals, narrow digits, three digits and totals. This verifies the sampled generated numeral ink, not every possible script or physical printer. Indian-script shaping remains blocked as before. Before/after fictional renders are under artifacts/pdf-alignment.

The public WebKit desktop issue came from the private sidebar offset/transition retaining state on a public page. The sidebar margin rule now applies only to private layouts; public shells explicitly remove the offset and transition. The notice-board test forces retained sidebar state and checks page reflow at all viewport sizes.
