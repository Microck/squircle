## Basics

- [x] Favicon and app icons (`app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png`) verified in source
- [ ] Web app manifest
- [x] Theme color meta tag
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] .well-known/security.txt
- [x] Custom production domain configured in Vercel (`squircle.micr.dev`)
- [x] Production custom domain responds over HTTPS
- [ ] Custom-domain DNS note verified against the current Vercel DNS setup

## Performance

- [ ] Loading states for long-running import/export actions
- [x] Code splitting for batch export (`import("jszip")`)
- [x] Cache headers (`Cache-Control`, `ETag`) on the production response
- [x] CDN for static assets via Vercel
- [x] Font loading strategy (`next/font`)
- [x] Preload critical resources
- [x] Image optimization for site-owned assets (`next/image` for the page logo)

## SEO

- [x] Unique title tags per page
- [x] Meta description
- [ ] Canonical URLs
- [x] Open Graph tags
- [x] Twitter Card tags
- [ ] Structured data (JSON-LD)
- [x] Semantic HTML (`main`)
- [ ] Alt text audit for all non-decorative images

## Accessibility

- [ ] Keyboard navigation support audit
- [ ] Visible focus indicators audit
- [ ] Color contrast audit (WCAG AA+)
- [ ] Screen reader testing
- [ ] Associated labels and instructions audit for editor controls
- [ ] ARIA-live messaging for validation or export errors

## Security

- [x] HTTPS enforced (HTTP redirects to HTTPS in production)
- [x] HSTS header
- [ ] Content Security Policy
- [ ] X-Frame-Options or `frame-ancestors`
- [ ] X-Content-Type-Options
- [ ] Referrer-Policy
- [ ] Permissions-Policy
- [ ] Input validation and sanitization audit

## UI/UX

- [x] Responsive design
- [ ] Touch targets >= 44x44 px audit
- [ ] Loading states audit across upload, preview, and export flows
- [ ] Custom 404/500 pages
- [x] Single-screen navigation is intentionally simple

## Legal & Privacy

- [ ] Contact information page or footer
- [ ] Copyright notice

## Development & Deployment

- [ ] CI/CD pipeline
- [x] Automated tests
- [x] Linting
- [x] Build pipeline
- [ ] Uptime monitoring
- [ ] Rollback plan
