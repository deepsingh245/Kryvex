# Kryvex — Visual System & UI Implementation Guide

> **Status:** V1 visual source of truth  
> **Product:** Kryvex — private personal vault for passwords, credentials, secure notes, files and other protected information  
> **Design direction:** Premium · Private · Calm · Precise · Modern  
> **Primary implementation target:** Web + native mobile  
> **Design reference:** Kryvex Visual System / First 3 Screens concept board

---

## 1. Design Philosophy

Kryvex should feel like a **premium security product**, not a generic password manager.

The visual language should communicate:

- **Privacy** — quiet, controlled, protected
- **Trust** — stable, predictable, mature
- **Simplicity** — no unnecessary visual noise
- **Precision** — consistent spacing, alignment and component behavior
- **Premium quality** — subtle gradients, depth and polished micro-interactions
- **Modernity** — contemporary product UI without becoming flashy

### Avoid

Do NOT make Kryvex look like:

- a crypto wallet
- a hacker/cybersecurity dashboard
- a neon futuristic terminal
- a generic Bootstrap dashboard
- a default Material Design app
- an over-glowing "AI" product
- a black screen covered in green text
- a UI made entirely from glassmorphism

The product should feel closer to the **quality bar** of products such as 1Password, Linear, Raycast and Arc while remaining completely original.

---

# 2. Brand Identity

## Product Name

**Kryvex**

Pronunciation can be treated as:

> KRIV-ex

## Brand personality

| Attribute | Direction |
|---|---|
| Secure | High |
| Premium | High |
| Minimal | High |
| Technical | Medium |
| Friendly | Medium |
| Playful | Low |
| Futuristic | Medium |
| Corporate | Low |

## Brand statement

**Your private vault. Always.**

Supporting idea:

> Store passwords, credentials, secure notes, files and more — all in one encrypted vault, accessible only by you.

---

# 3. Logo Direction

The visual concept uses a stylized **K** as the primary brand mark.

### Logo characteristics

- Geometric
- Angular but not aggressive
- Recognizable at 16–24px
- Works in monochrome
- Works on dark and light backgrounds
- Can be used independently from the wordmark

### Logo usage

Primary:

```text
[K] Kryvex
```

Compact:

```text
[K]
```

Never:

- distort the logo
- add excessive glow
- use multiple competing gradients
- place the logo inside a generic shield unless specifically required

---

# 4. Color System

Kryvex is primarily a **dark-first application**.

## 4.1 Core colors

### Primary

```text
Primary:        #6366F1
Primary Hover:  #4F46E5
Primary Soft:   #818CF8
```

Use primary for:

- primary CTA
- active navigation
- focused controls
- important links
- selected states
- progress
- subtle brand accents

### Background

```text
Background:     #080B14
Surface:        #111827
Surface 2:      #151C2B
Card:           #1A2332
```

The interface should not be pure black.

Use dark navy/blue-black surfaces to create hierarchy.

### Text

```text
Text Primary:   #F8FAFC
Text Secondary: #94A3B8
Text Muted:     #64748B
```

### Borders

```text
Border:         #1F2937
Border Strong:  #334155
Border Focus:   #6366F1
```

### Semantic colors

```text
Success:        #10B981
Warning:        #F59E0B
Error:          #EF4444
Info:           #38BDF8
```

Semantic colors should be restrained.

Do not turn the entire UI green/red/yellow.

---

# 5. Light Theme

Kryvex should support a polished light theme, but **dark remains the primary visual identity**.

```text
Background:     #F8FAFC
Surface:        #FFFFFF
Surface 2:      #F1F5F9
Card:           #FFFFFF

Text Primary:   #0F172A
Text Secondary: #475569
Text Muted:     #64748B

Border:         #E2E8F0
Border Strong:  #CBD5E1

Primary:        #4F46E5
Primary Hover:  #4338CA
```

The light theme should feel like the same product, not a separate design.

---

# 6. Accent Gradient

Kryvex may use a restrained brand gradient:

```text
#6366F1 → #4F46E5
```

Optional atmospheric gradient:

```text
#6366F1 → #7C3AED
```

Rules:

- gradients are accents, not backgrounds everywhere
- use them for hero areas, brand marks, progress and selected highlights
- never use gradients on every button/card
- never use strong rainbow gradients

---

# 7. Typography

Recommended primary font:

**Inter**

Fallback:

```text
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

## Type scale

### Display

```text
Display:
48px / 56px
Weight: 700
Letter spacing: -0.04em
```

### H1

```text
32px / 40px
Weight: 700
Letter spacing: -0.025em
```

### H2

```text
24px / 32px
Weight: 650–700
```

### H3

```text
20px / 28px
Weight: 600–650
```

### Body

```text
16px / 24px
Weight: 400
```

### Small

```text
14px / 20px
Weight: 400–500
```

### Caption

```text
12px / 16px
Weight: 500
```

### Code / secrets

Use a monospace font:

```text
JetBrains Mono
```

or:

```text
ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
```

Use monospace for:

- API keys
- recovery codes
- generated passwords
- OTP codes
- technical identifiers

---

# 8. Spacing System

Use a 4px base grid.

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Recommended usage:

| Size | Usage |
|---|---|
| 4px | icon/text micro spacing |
| 8px | tight component spacing |
| 12px | labels |
| 16px | standard component padding |
| 20px | card internal spacing |
| 24px | card/page spacing |
| 32px | section spacing |
| 40px | major groups |
| 48px | page sections |
| 64px | hero spacing |
| 80–96px | large visual breathing room |

Never randomly use values such as 13px, 19px, 27px unless there is a specific design reason.

---

# 9. Border Radius

Primary radius:

```text
16px
```

Scale:

```text
4px   — tiny controls
8px   — inputs/small controls
12px  — buttons
16px  — cards
20px  — large cards
24px  — hero/major surfaces
```

The application should feel soft and premium without becoming excessively rounded.

Avoid "everything is a pill".

---

# 10. Shadows

Dark mode should use **subtle depth**, not huge shadows.

### Small

```text
0 2px 8px rgba(0,0,0,0.18)
```

### Medium

```text
0 8px 24px rgba(0,0,0,0.24)
```

### Large

```text
0 20px 50px rgba(0,0,0,0.30)
```

Use shadows primarily to establish layers.

---

# 11. Glass / Blur

Glass effects are optional and limited.

Use:

```text
background: rgba(...)
backdrop-filter: blur(...)
border: 1px solid rgba(...)
```

Good locations:

- floating navigation
- modal overlays
- mobile bottom sheets
- onboarding visual layers

Do not use glassmorphism for every card.

---

# 12. Icons

Primary icon library:

**Lucide**

Reasons:

- clean
- consistent
- open
- excellent React integration
- strong coverage
- visually aligned with Kryvex

Use icons at:

```text
14px — compact metadata
16px — normal controls
18px — navigation
20px — buttons
24px — feature icons
28–32px — hero/security icons
```

Do not mix icon families.

Avoid emojis as UI icons.

---

# 13. Buttons

## Primary

```text
Background: Primary
Text: White
Radius: 12px
Height: 44–48px
```

Primary button examples:

- Get Started
- Continue
- Unlock
- Save
- Create Item

## Secondary

Transparent/surface button with border.

## Ghost

No visible border until interaction.

## Destructive

Use only for:

- Delete
- Destroy
- Revoke
- Permanently remove

Never make destructive actions visually dominant unless confirmation is required.

---

# 14. Inputs

Inputs are extremely important in Kryvex because passwords and secrets are entered frequently.

Default:

```text
Height: 44–48px
Radius: 10–12px
Border: 1px solid Border Strong
Background: Surface
```

Focus:

```text
Border: Primary
Ring: subtle primary ring
```

Password fields must include:

- show/hide control
- accessible label
- secure autocomplete semantics where appropriate
- clear validation
- no password value in logs

---

# 15. Cards

Card style:

```text
Background: Surface/Card
Border: 1px solid Border
Radius: 16px
Padding: 20–24px
```

Cards should have clear hierarchy.

A card should usually contain:

```text
Icon
Title
Description/metadata
Optional action
```

Avoid excessive card nesting.

---

# 16. Navigation

Desktop:

```text
Left sidebar
Main content
Optional contextual panel
```

Suggested sidebar:

```text
Kryvex
────────────────

All Items
Favorites
Recently Used

Categories
  Logins
  Secure Notes
  Cards
  Identities
  API Keys
  Recovery Codes
  Files

────────────────

Settings
Lock Vault
```

Mobile:

- top bar
- bottom navigation where appropriate
- sheets/drawers for secondary navigation

---

# 17. Core Components

Build these as reusable components.

```text
Button
Input
PasswordInput
SearchInput
Card
Dialog
Sheet
Drawer
Dropdown
Popover
Tooltip
Tabs
Accordion
Badge
Tag
Avatar
Toast
Alert
Progress
Skeleton
EmptyState
CommandPalette
Sidebar
Breadcrumb
DataTable
FilePreview
PasswordStrength
SecretReveal
VaultLock
ItemCard
ItemList
CategoryIcon
ConfirmDialog
```

Security-specific components:

```text
PasswordGenerator
SecretField
CopySecretButton
RevealSecretButton
AutoLockIndicator
VaultStatus
EncryptedFilePreview
RecoveryCodeGrid
TOTPDisplay
```

---

# 18. Motion

Animation should feel **fast, subtle and intentional**.

Default durations:

```text
Fast:    100–150ms
Normal:  150–220ms
Slow:    250–350ms
```

Use:

- opacity
- transform
- scale
- height
- blur

Avoid:

- bouncing
- excessive spring physics
- spinning security icons
- flashy transitions
- animations that delay security actions

Reduced-motion accessibility must be respected.

---

# 19. Interaction States

Every component needs:

```text
Default
Hover
Focus
Pressed
Disabled
Loading
Success
Error
```

Security-sensitive controls should also consider:

```text
Hidden
Revealed
Copied
Locked
Expired
Unavailable
```

Example:

Password:

```text
••••••••••••••••
```

Reveal:

```text
correct-horse-battery...
```

Copied:

```text
✓ Copied
```

Automatically return to the hidden state where appropriate.

---

# 20. First Three Screens

## Screen 01 — Welcome / Onboarding

Purpose:

Introduce Kryvex without overwhelming the user.

Structure:

```text
Logo

Kryvex

Your private vault. Always.

Store everything that matters

Passwords, credentials, secure notes,
files, and more — all in one encrypted
vault, accessible only by you.

[ Secure visual illustration ]

[ Get Started ]

I already have an account
```

Visual:

- dark navy background
- large brand mark
- subtle indigo atmospheric glow
- floating secure-item cards
- generous whitespace
- no busy dashboard elements

---

# 21. Screen 02 — Create Master Password

Purpose:

Create the root secret used to unlock/decrypt the vault.

Structure:

```text
Back

[ Security icon ]

Create Master Password

This password will be used to encrypt
your vault. Make it strong and memorable.

Master password
[ •••••••••••••••••        👁 ]

Password strength
[ strength meter ]

Confirm password
[ •••••••••••••••••        👁 ]

✓ At least 12 characters
✓ Include uppercase and lowercase
✓ Include a number
✓ Include a special character

[ Continue ]
```

Important:

- This screen must visually communicate that this password is important.
- Do not use frightening copy.
- Do not claim "unhackable".
- Make the security requirements understandable.
- Strength feedback should be clear but not noisy.

---

# 22. Screen 03 — Unlock Vault

Purpose:

Fast everyday vault access.

Structure:

```text
[ Security icon ]

Unlock Your Vault

Enter your master password
to access your secure vault.

Master password
[ •••••••••••••••••        👁 ]

[ Unlock ]

Forgot password?

[ biometric icon ]

Use Face ID / Touch ID
for faster access
```

Important:

The unlock screen should feel faster and calmer than onboarding.

It is an everyday screen.

---

# 23. Responsive Rules

## Desktop

Recommended content max width:

```text
1200–1440px
```

Page horizontal padding:

```text
32–48px
```

Sidebar:

```text
240–280px
```

## Tablet

Reduce:

- sidebar width
- page padding
- card gaps

## Mobile

Page padding:

```text
16–20px
```

Touch target:

```text
minimum 44px
```

Avoid desktop UI simply squeezed into mobile.

Mobile should feel intentionally designed.

---

# 24. Accessibility

Target:

**WCAG 2.2 AA**

Requirements:

- keyboard navigation
- visible focus states
- accessible labels
- sufficient contrast
- screen-reader support
- semantic HTML
- reduced motion
- touch targets >= 44px
- no color-only meaning
- error messages associated with fields

---

# 25. Theme Architecture

Use semantic design tokens rather than hard-coded colors throughout components.

Example conceptual tokens:

```text
background
foreground
surface
surface-muted
card
card-foreground

primary
primary-foreground

secondary
secondary-foreground

muted
muted-foreground

accent
accent-foreground

destructive
destructive-foreground

border
input
ring

success
warning
info
```

This allows dark/light themes without rewriting components.

---

# 26. Web UI Stack

## Recommended

```text
Next.js
React
TypeScript
Tailwind CSS v4
shadcn/ui
Lucide React
React Hook Form
Zod
Sonner
```

Use **shadcn/ui as the component foundation**, not as a visual prison.

shadcn/ui is especially appropriate because its components are distributed as source code that can be directly customized instead of forcing Kryvex to inherit a generic component library design.

Official documentation:

https://ui.shadcn.com/

Current shadcn supports Tailwind v4 and React 19, and its current CLI supports choosing Base UI, Radix UI, or React Aria primitives. New projects now default to Base UI, while Radix remains supported.

For Kryvex, prefer the current **Base UI foundation through shadcn/ui** unless a specific component requires another supported primitive.

---

# 27. Native Mobile UI Strategy

Do not attempt to force web shadcn components directly into React Native.

Recommended:

```text
React Native
Expo
TypeScript
NativeWind
Lucide React Native
React Native Reanimated
```

NativeWind provides Tailwind-style styling across React Native platforms while retaining native style output.

For components that must behave identically across web and native, share:

- design tokens
- types
- validation
- business logic
- component specifications

Do not force identical implementation when platform conventions should differ.

---

# 28. Cross-Platform Design Tokens

Create a shared package:

```text
packages/design-system/
```

Example:

```text
tokens/
  colors.ts
  spacing.ts
  typography.ts
  radius.ts
  shadows.ts
  motion.ts
```

The web and mobile applications consume the same semantic values.

---

# 29. Recommended Project UI Structure

```text
apps/
  web/
    components/
      ui/
      layout/
      vault/
      auth/
      security/
      files/
    app/
    styles/

  mobile/
    components/
      ui/
      layout/
      vault/
      auth/
      security/
      files/

packages/
  design-system/
  types/
  validation/
  crypto/
  vault/
```

---

# 30. UI Engineering Rules

Claude must:

1. Never invent a new visual style for individual screens.
2. Always use the Kryvex design tokens.
3. Reuse existing components.
4. Never introduce another icon library without approval.
5. Never introduce another component library without approval.
6. Never hard-code random colors.
7. Never hard-code random spacing.
8. Never use inconsistent border radii.
9. Never create one-off buttons when the Button component can be used.
10. Never sacrifice accessibility for visual appearance.
11. Never expose secrets through UI state unnecessarily.
12. Never log secrets.
13. Never put sensitive values into URLs.
14. Never store secrets in localStorage.
15. Keep security UX calm and understandable.

---

## End of Kryvex UI Source of Truth
