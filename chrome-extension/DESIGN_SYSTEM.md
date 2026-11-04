# Browser workspace design system

The existing `src/styles/theme.css` tokens own color, borders, typography and appearance. System/light/dark are supported. On-page surfaces use the corresponding `--cv-*` tokens so host-page styling does not supply their colors.

- Main workspace: minimum 280px, maximum 1440px, viewport-height shell with scrolling inside the active view.
- Under 720px: one column, readable draft controls and stacked feedback; signed-out content starts near the top and scrolls at short heights.
- From 720px: balanced account introduction/feature guidance and separate writing editor/review columns. Conversations keep a readable maximum line width.
- From 1000px: welcome actions use four columns. Main actions stay visible in the composer.
- On-page writing card: 390px maximum, viewport-clamped width/height, scrolling body, fixed header/footer, keyboard focus and Escape dismissal.
- Status colors describe evidence. A limited local check or provider outage never gets a green all-clear. Completed AI checks say no suggestions were returned, rather than certifying error-free text.
- Counts come from actual text segmentation. Source labels identify local rules versus AI suggestions. Rewrites require preview and explicit apply.

Acceptance viewports: 300×560, 400×850, 768×900 and 1200×900. Validate both themes, empty/loading/error states and real scrolling; a narrow screenshot alone is insufficient.
