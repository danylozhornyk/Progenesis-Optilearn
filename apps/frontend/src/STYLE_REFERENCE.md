# Progenesis Style Reference
# Use this as a reference when building new pages and components.
# All classes below work correctly in both light and dark themes.

## Page layouts

### Full page with header and footer
<div className="min-h-screen flex flex-col bg-background">
  <Header />
  <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
    {content}
  </main>
  <Footer />
</div>

### Centered content page (auth style)
<div className="min-h-screen flex items-center justify-center px-6 bg-background">
  <div className="w-full max-w-md">
    {content}
  </div>
</div>

### Dashboard with sidebar
<div className="min-h-screen flex">
  <aside className="w-64 bg-sidebar border-r border-sidebar-border" />
  <main className="flex-1 bg-background" />
</div>

---

## Typography

### Page title
<h1 className="text-3xl font-semibold tracking-tight text-foreground">

### Section heading
<h2 className="text-xl font-semibold tracking-tight text-foreground">

### Card title
<h3 className="text-base font-semibold text-foreground">

### Body text
<p className="text-sm text-foreground leading-relaxed">

### Muted / secondary text
<p className="text-sm text-muted-foreground">

### Small label
<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">

### Code / monospace
<code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">

---

## Cards & surfaces

### Basic card
<div className="surface p-6 rounded-lg">

### Interactive card (hover effect)
<div className="surface-interactive p-6 rounded-lg cursor-pointer">

### Glass card (for overlays)
<div className="glass p-6 rounded-lg">

### Flat section (subtle background)
<div className="bg-muted/50 rounded-lg p-6">

---

## Form elements

### Form group
<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">Label</label>
  <input className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm 
                    focus:outline-none focus:ring-2 focus:ring-ring text-foreground
                    placeholder:text-muted-foreground" />
  <p className="text-xs text-muted-foreground">Helper text</p>
</div>

### Error message
<p className="text-sm font-medium text-destructive">

### Success message
<p className="text-sm font-medium text-green-600 dark:text-green-400">

---

## Badges & status

### Neutral badge
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                 bg-secondary text-secondary-foreground">

### Success badge
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">

### Warning badge
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">

### Error badge
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">

---

## Alerts / banners

### Info banner
<div className="p-4 rounded-lg bg-blue-50 border border-blue-200 
                dark:bg-blue-900/20 dark:border-blue-800
                text-sm text-blue-800 dark:text-blue-300">

### Warning banner
<div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200
                dark:bg-yellow-900/20 dark:border-yellow-800
                text-sm text-yellow-800 dark:text-yellow-300">

### Error banner
<div className="p-4 rounded-lg bg-red-50 border border-red-200
                dark:bg-red-900/20 dark:border-red-800
                text-sm text-red-800 dark:text-red-300">

### Success banner
<div className="p-4 rounded-lg bg-green-50 border border-green-200
                dark:bg-green-900/20 dark:border-green-800
                text-sm text-green-800 dark:text-green-300">

---

## Dividers

### Horizontal divider
<div className="divider my-6" />

### Divider with text
<div className="relative my-6">
  <div className="divider" />
  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                   bg-background px-3 text-xs text-muted-foreground">
    or
  </span>
</div>

---

## Loading states

### Spinner
<div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />

### Skeleton
<div className="h-4 bg-muted rounded animate-pulse w-3/4" />

---

## Page animations (add to page wrapper)

### Fade in on load
<div className="animate-fade-in">

### Slide in on load
<div className="animate-slide-in">

---

## Background effects

### Subtle gradient (for hero sections)
<div className="bg-background bg-subtle-gradient">

---

## Rules to follow for every new page

1. Always use semantic color tokens (bg-background, text-foreground) — never hardcode colors like bg-white or text-black
2. For dark mode specific overrides use the dark: prefix — e.g. dark:bg-zinc-900
3. Use surface or surface-interactive utility classes for cards instead of manual border/bg combinations
4. Status colors (green, yellow, red) always need both light and dark variants
5. All text must meet contrast requirements — use text-foreground for primary, text-muted-foreground for secondary
6. Add theme-transition class to any container that switches colors on theme change
