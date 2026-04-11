## Basics

- [x] Favicon (`app/favicon.ico`)
- [ ] Web app manifest
- [x] Theme color meta tag
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] .well-known/security.txt
- [x] Custom production domain configured in Vercel (`squircle.micr.dev`)
- [ ] DNS A record verified for `squircle.micr.dev -> 76.76.21.21`

## Performance

- [ ] Loading skeletons or spinners
- [ ] Lazy loading for images/iframes
- [ ] Cache headers (Cache-Control, ETag)
- [x] Font loading strategy
- [x] Preload critical resources
- [ ] Image optimization (`next/image`, `srcset`, or equivalent)

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
- [ ] Skip link
- [ ] Associated form labels audit
- [ ] ARIA-live for dynamic errors

## Security

- [ ] HTTPS enforced policy documented
- [ ] HSTS header documented
- [ ] Content Security Policy
- [ ] X-Frame-Options or `frame-ancestors`
- [ ] X-Content-Type-Options
- [ ] Referrer-Policy
- [ ] Permissions-Policy
- [ ] Input validation and sanitization audit

## UI/UX

- [x] Responsive design
- [ ] Touch targets >= 44x44 px audit
- [ ] Loading states audit
- [ ] Custom 404/500 pages
- [x] Single-screen navigation is intentionally simple

## Legal & Privacy

- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie consent decision documented
- [ ] Contact information page or footer
- [ ] Copyright notice

## Development & Deployment

- [ ] Environment variables documented
- [ ] CI/CD pipeline
- [x] Automated tests
- [x] Linting
- [x] Build pipeline
- [ ] Error tracking
- [ ] Analytics
- [ ] Uptime monitoring
- [ ] Rollback plan
