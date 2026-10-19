# Kryvex Marketing Homepage — Design QA

Date: 2026-10-18

## Review target

- Route: `http://localhost:4173/welcome`
- Selected visual direction: Option 2, editorial light canvas with a dark product visual
- Source visual: `C:\Users\simra\.codex\generated_images\01a144e8-eded-7c52-9cce-14c9e6312764\exec-8812e660-1ca6-4d33-94b2-1b818286570c.png`
- Implemented source: `apps/web/src/components/marketing/MarketingHome.tsx`

## Rendered evidence

- Desktop viewport, 1440 × 1024: `.better-design/qa/implementation-desktop.jpg`
- Mobile viewport, 390 × 844: `.better-design/qa/implementation-mobile.jpg`
- Security section focus: `.better-design/qa/implementation-security.jpg`
- FAQ expanded state: `.better-design/qa/implementation-faq-open.jpg`
- Source-to-implementation hero comparison: `.better-design/qa/hero-comparison.jpg`

The comparison capture predates the final copy-density pass. The final source removes the secondary hero action, the decorative content-type chips, and the eyebrow label; this reduces visual load without changing the reviewed grid, image treatment, or responsive behavior.

## Dimensions, density, and states

- Desktop: two-column hero, restrained 1280px content width, high whitespace, and one dominant conversion action.
- Mobile: single-column flow with `clientWidth: 375` and `scrollWidth: 375`; no horizontal overflow was observed.
- Content density: long-form landing page with progressive sections rather than a dense application dashboard.
- Interaction state checked: default page, expanded FAQ, and primary CTA navigation to `/sign-up`.
- Browser console: no warnings or errors during the rendered review.

## Findings and comparison history

1. The first implementation followed the selected Option 2 hierarchy but included a secondary hero link and five content-type chips.
2. Better Design's first-view comprehension check flagged excess explanation time and insider wording around API/sync terminology.
3. Copy was rewritten in everyday language, the hero was reduced to one primary action, and nonessential tags were removed.
4. Final first-view comprehension check: pass, 33 words, estimated 11 seconds, zero findings.
5. The production artwork was regenerated to remove the unshipped “Shared” feature from the illustrated vault.
6. Desktop and mobile visual inspection found no clipping, overlap, broken wrapping, or horizontal overflow.

The Better Design spacing harness requested fresh DOM captures at 1440, 1728, and 390 widths. A browser security gate blocked the second automated capture pass after the successful manual 1440 and 390 review. No bypass was attempted. Static layout review, saved rendered evidence, the no-overflow measurement, and successful production compilation cover the implemented responsive structure; 1728 remains an evidence limitation rather than an observed defect.

## Accessibility and interaction checks

- Semantic landmarks and heading order are present.
- Navigation and CTAs use real links with visible focus styles.
- FAQ uses native `details`/`summary` disclosure behavior.
- Product imagery has descriptive alt text.
- Tap targets are at least 44px for primary actions and disclosures.
- Decorative icons are hidden from assistive technology.

## Security review

- No encryption, authentication, authorization, storage, synchronization, key-management, password-handling, or attachment logic changed.
- The page links to the existing `/sign-up`, `/sign-in`, and `/recover` flows; it does not weaken the current auth and vault-unlock separation.
- Security copy states that encryption happens on the device and the server receives encrypted data; it makes no “unhackable” or “military-grade” claim.
- Demo artwork contains only fake, masked credentials and no real secrets.
- No server-side plaintext capability was introduced.

## Verification

- Focused Vitest file: 3 tests passed.
- TypeScript: passed.
- ESLint: passed.
- Next.js production build: passed; `/welcome` prerendered successfully.

## Final result

passed
