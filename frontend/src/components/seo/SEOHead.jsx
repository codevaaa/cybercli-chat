import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Codeva'
const SITE_URL = 'https://cybermindcli.info'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
const TWITTER_HANDLE = '@cybermindcli'

/**
 * SEOHead — Reusable SEO component for all pages.
 * Manages title, meta description, OG tags, Twitter cards,
 * canonical URL, keywords, and JSON-LD structured data.
 *
 * @param {object} props
 * @param {string} props.title — Page title (will be suffixed with " | Codeva")
 * @param {string} props.description — Meta description (max 160 chars)
 * @param {string} [props.keywords] — Comma-separated keywords
 * @param {string} [props.path] — URL path (e.g., "/features") for canonical
 * @param {string} [props.ogImage] — OG image URL (defaults to site OG image)
 * @param {string} [props.ogType] — OG type (defaults to "website")
 * @param {object|object[]} [props.structuredData] — JSON-LD structured data object(s)
 * @param {boolean} [props.noIndex] — If true, adds noindex meta
 * @param {string} [props.article] — Article-specific meta (publishedTime, modifiedTime, author)
 */
export default function SEOHead({
  title,
  description,
  keywords,
  path = '',
  ogImage,
  ogType = 'website',
  structuredData,
  noIndex = false,
  article,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Premium Multi-Model AI Chat Platform`
  const canonicalUrl = `${SITE_URL}${path}`
  const imageUrl = ogImage || DEFAULT_OG_IMAGE

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || 'Codeva — The premium multi-model AI workspace. Access 50+ free AI models, Council Mode, voice chat, and more.'} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || 'The premium multi-model AI workspace. Access 50+ free AI models, Council Mode, voice chat, and more.'} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OG */}
      {article?.publishedTime && <meta property="article:published_time" content={article.publishedTime} />}
      {article?.modifiedTime && <meta property="article:modified_time" content={article.modifiedTime} />}
      {article?.author && <meta property="article:author" content={article.author} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || 'The premium multi-model AI workspace. Access 50+ free AI models, Council Mode, voice chat, and more.'} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        Array.isArray(structuredData)
          ? structuredData.map((sd, i) => (
              <script key={i} type="application/ld+json">
                {JSON.stringify(sd)}
              </script>
            ))
          : (
              <script type="application/ld+json">
                {JSON.stringify(structuredData)}
              </script>
            )
      )}
    </Helmet>
  )
}

/**
 * Pre-built structured data generators for common page types.
 */
export const StructuredData = {
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Codeva',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Premium multi-model AI chat platform with 50+ free AI models, Council Mode, voice chat, and developer API.',
    sameAs: [
      'https://twitter.com/cybermindcli',
      'https://discord.gg/codeva',
      'https://linkedin.com/company/codeva',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'cybermindcli@cybermindcli.com',
      contactType: 'customer support',
      availableLanguage: ['English', 'Hindi'],
    },
  }),

  website: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Codeva',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/chat?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }),

  breadcrumb: (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }),

  blogPosting: ({ title, description, image, datePublished, dateModified, author, slug }) => ({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: image || DEFAULT_OG_IMAGE,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author || 'Codeva Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Codeva',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${slug}`,
    },
  }),

  softwareApplication: ({ name, description, category }) => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory: category || 'Artificial Intelligence',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    provider: {
      '@type': 'Organization',
      name: 'Codeva',
    },
  }),

  faqPage: (questions) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  }),

  product: ({ name, description, price, priceCurrency = 'USD' }) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    brand: { '@type': 'Brand', name: 'Codeva' },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency,
      availability: 'https://schema.org/InStock',
    },
  }),
}
