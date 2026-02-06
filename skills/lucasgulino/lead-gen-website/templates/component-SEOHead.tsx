import { useEffect } from 'react'

interface SEOHeadProps {
  title: string
  description: string
  canonical: string
  ogImage?: string
  jsonLd?: object
}

export default function SEOHead({ title, description, canonical, ogImage, jsonLd }: SEOHeadProps) {
  useEffect(() => {
    document.title = title

    const metaTags = [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: `https://{{DOMAIN}}${canonical}` },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ]

    if (ogImage) {
      metaTags.push({ property: 'og:image', content: ogImage })
      metaTags.push({ name: 'twitter:image', content: ogImage })
    }

    metaTags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`
      let meta = document.querySelector(selector)

      if (!meta) {
        meta = document.createElement('meta')
        if (name) meta.setAttribute('name', name)
        if (property) meta.setAttribute('property', property)
        document.head.appendChild(meta)
      }

      meta.setAttribute('content', content)
    })

    let linkCanonical = document.querySelector('link[rel="canonical"]')
    if (!linkCanonical) {
      linkCanonical = document.createElement('link')
      linkCanonical.setAttribute('rel', 'canonical')
      document.head.appendChild(linkCanonical)
    }
    linkCanonical.setAttribute('href', `https://{{DOMAIN}}${canonical}`)

    if (jsonLd) {
      let script = document.querySelector('script[type="application/ld+json"]')
      if (!script) {
        script = document.createElement('script')
        script.setAttribute('type', 'application/ld+json')
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(jsonLd)
    }
  }, [title, description, canonical, ogImage, jsonLd])

  return null
}
