# SEO & Production Files Checklist

## ✅ Files Created

### SEO Files
- **`public/robots.txt`** - Tells search engines what to crawl
- **`app/sitemap.ts`** - Dynamic sitemap for Google Search Console
- **`app/manifest.ts`** - PWA manifest for mobile installs

### Legal/Compliance Pages
- **`app/terms/page.tsx`** - Terms of Service
- **`app/privacy/page.tsx`** - Privacy Policy
- **`app/cookies/page.tsx`** - Cookie Policy
- **`app/dpa/page.tsx`** - Data Processing Agreement
- **`app/security/page.tsx`** - Security & Compliance page

### Error Pages
- **`app/not-found.tsx`** - Custom 404 page

## 📝 Next Steps (Optional but Recommended)

### 1. Open Graph Images
Create social sharing images:
- `/public/og-image.png` (1200x630px) - For Facebook/LinkedIn sharing
- `/public/twitter-image.png` (1200x675px) - For Twitter sharing

Then uncomment the `images` arrays in `app/layout.tsx` metadata.

### 2. Environment Variable
Add to `.env`:
```bash
NEXT_PUBLIC_SITE_URL=https://casebrainhub.com
```
This is used by the sitemap. For local dev, it defaults to `https://casebrainhub.com`.

### 3. Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your domain
3. Submit `sitemap.xml` (Next.js auto-generates from `app/sitemap.ts`)
4. Verify ownership

### 4. Favicon & App Icons
The app already has `app/favicon.ico`. For better mobile support, add:
- `/public/icon-192.png` (192x192)
- `/public/icon-512.png` (512x512)

Then update `app/manifest.ts` to reference them.

### 5. Legal Review
Have a solicitor review the Terms, Privacy, Cookies, and DPA pages before going live. 
These are templates and may need firm-specific adjustments.

## 🔍 SEO Best Practices Already Implemented

✅ Meta tags in `app/layout.tsx`
✅ Structured sitemap
✅ robots.txt configured
✅ Semantic HTML
✅ Mobile-responsive design
✅ Fast page loads (Next.js optimizations)

## 📊 Analytics Setup

For production analytics:
1. Add Google Analytics or similar
2. Update `app/layout.tsx` to include analytics script
3. Ensure GDPR compliance (cookie consent if required)

## 🚀 Deployment Checklist

Before going live:
- [ ] Review all legal pages with a solicitor
- [ ] Create Open Graph images
- [ ] Set `NEXT_PUBLIC_SITE_URL` in production env
- [ ] Submit sitemap to Google Search Console
- [ ] Test all footer links work
- [ ] Verify 404 page displays correctly
- [ ] Check mobile responsiveness
- [ ] Test social sharing (with OG images)

