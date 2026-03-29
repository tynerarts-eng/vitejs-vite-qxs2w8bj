import './style.css'
import heroImg from './assets/hero.png'
import { fetchContent } from './content-api.js'

function escapeHtml(value = '') {
  return value
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderRevealClass(extra = '') {
  return ['reveal', extra].filter(Boolean).join(' ')
}

function getTimeTheme() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 17) return 'morning'
  return 'evening'
}

function renderStudioGallery(images) {
  const items = Array.isArray(images) ? images : images ? [images] : []
  if (items.length === 0) return ''

  return items
    .map(
      (image, index) => `
        <figure class="studio-gallery-item ${renderRevealClass()}" style="--reveal-delay: ${index * 90}ms">
          ${image.path ? `<img src="${image.path}" alt="${escapeHtml(image.alt || image.caption)}" />` : ''}
          ${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ''}
        </figure>
      `,
    )
    .join('')
}

function renderMapEmbed(src) {
  if (!src) return ''

  return `
    <div class="studio-map-frame">
      <iframe
        src="${escapeHtml(src)}"
        loading="lazy"
        allowfullscreen=""
        referrerpolicy="no-referrer-when-downgrade"
        title="Studio location map"
      ></iframe>
    </div>
  `
}

function renderNav(site, currentPage) {
  return site.nav
    .map((item) => {
      const state = item.key === currentPage ? ' aria-current="page"' : ''
      return `<a href="${item.href}"${state}>${escapeHtml(item.label)}</a>`
    })
    .join('')
}

function renderBehanceIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 6.25H3V18h4.92c2.82 0 4.44-1.39 4.44-3.77 0-1.62-.83-2.69-2.29-3.05 1.03-.42 1.62-1.33 1.62-2.53 0-1.88-1.48-3.4-4.19-3.4zm-.09 4.63H5.16V7.99H7.3c1.28 0 2.02.52 2.02 1.42 0 .95-.73 1.47-1.91 1.47zm.2 4.99H5.16v-3.15h2.45c1.44 0 2.23.53 2.23 1.57 0 1.06-.8 1.58-2.23 1.58zM14 8.5h7V6.25h-7V8.5zm3.5 9.73c2.46 0 4.18-1.18 4.86-3.23H20c-.41.83-1.24 1.25-2.41 1.25-1.56 0-2.63-.98-2.72-2.57h7.71c.06-.29.09-.65.09-1 0-2.98-2.02-4.93-5.09-4.93-3.14 0-5.26 2.14-5.26 5.29 0 3.22 2.09 5.19 5.18 5.19zm-2.59-6.46c.16-1.4 1.16-2.25 2.54-2.25 1.44 0 2.34.86 2.37 2.25h-4.91z"/>
    </svg>
  `
}

function renderShell(site, contact, currentPage, heroMarkup, bodyMarkup) {
  document.querySelector('#app').innerHTML = `
    <div class="site-shell page-${currentPage}">
      <header class="hero ${currentPage === 'home' ? 'hero-home' : 'hero-subpage'}" id="top">
        <nav class="topbar" aria-label="Primary">
          <a class="brand" href="/">${escapeHtml(site.siteTitle)}</a>
          <div class="nav-links">
            ${renderNav(site, currentPage)}
          </div>
        </nav>
        ${heroMarkup}
      </header>

      <main>${bodyMarkup}</main>

      <footer class="site-footer">
        <p>${escapeHtml(site.footer.text)}</p>
        <div class="site-footer-links">
          <a href="${contact.emailHref}">${escapeHtml(site.footer.linkLabel)}</a>
          <a
            class="social-link"
            href="https://www.instagram.com/brucetynerfineart"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow Bruce Tyner Fine Art on Instagram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2m0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95zm8.95 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8"/>
            </svg>
            <span>Instagram</span>
          </a>
          <a
            class="social-link"
            href="https://www.facebook.com/tynerart/"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow Bruce Tyner Fine Art on Facebook"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 2 6.48 2 12.07 2 17.03 5.66 21.2 10.44 22v-7.02H8.08V12.1h2.36V9.88c0-2.33 1.39-3.61 3.52-3.61 1.02 0 2.09.18 2.09.18v2.3h-1.18c-1.16 0-1.52.72-1.52 1.46v1.74h2.59l-.41 2.88h-2.18V22C18.34 21.2 22 17.03 22 12.07z"/>
            </svg>
            <span>Facebook</span>
          </a>
          <a
            class="social-link"
            href="https://www.behance.net/brucetyner"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow Bruce Tyner Fine Art on Behance"
          >
            ${renderBehanceIcon()}
            <span>Behance</span>
          </a>
        </div>
      </footer>
    </div>
  `
}

function renderHomeCards(items) {
  return items
    .map(
      (item, index) => `
        <article class="card card-link ${renderRevealClass()}" style="--reveal-delay: ${index * 80}ms">
          <p class="card-eyebrow">${escapeHtml(item.eyebrow)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text)}</p>
          <a class="text-link" href="${item.href}">${escapeHtml(item.linkLabel)}</a>
        </article>
      `,
    )
    .join('')
}

function renderHighlights(items) {
  const entries = Array.isArray(items) ? items : items ? [items] : []

  return entries
    .map(
      (item, index) => `
        <article class="highlight ${renderRevealClass()}" style="--reveal-delay: ${index * 90}ms">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text)}</p>
        </article>
      `,
    )
    .join('')
}

function getHomeHeroSlides(content) {
  const collections = Array.isArray(content?.portfolio?.collections) ? content.portfolio.collections : []
  const slides = collections
    .flatMap((collection) => (Array.isArray(collection.items) ? collection.items : []))
    .filter((item) => item?.status === 'published' && (item.originalPath || item.thumbnailPath))
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
    .slice(0, 4)
    .map((item) => ({
      src: item.originalPath || item.thumbnailPath,
      alt: item.altText || item.title || 'Featured painting',
      title: item.title || '',
      meta: [item.medium, item.year].filter(Boolean).join(' · '),
    }))

  if (slides.length > 0) return slides

  return [
    {
      src: heroImg,
      alt: 'Featured artwork',
      title: '',
      meta: '',
    },
  ]
}

function renderHomeHero(content) {
  const slides = getHomeHeroSlides(content)
  const homeHero = {
    eyebrow: 'Selected paintings',
    title: 'Light, Place, and Memory in Paint',
    lede: 'A quiet view into recent work, shaped by observation, atmosphere, and the places that linger.',
    primaryCtaLabel: 'Enter Gallery',
    primaryCtaHref: '/portfolio.html',
    secondaryCtaLabel: 'Visit the Studio',
    secondaryCtaHref: '/studio.html',
  }

  const slideMarkup = slides
    .map(
      (slide, index) => `
        <figure class="hero-slide${index === 0 ? ' is-active' : ''}" data-hero-slide="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}">
          <img src="${slide.src}" alt="${escapeHtml(slide.alt)}" />
        </figure>
      `,
    )
    .join('')

  const activeSlide = slides[0]

  return `
    <section class="hero-stage" aria-label="Featured paintings">
      <div class="hero-stage-media">
        ${slideMarkup}
      </div>
      <div class="hero-stage-overlay"></div>
      <div class="hero-stage-copy">
        <p class="eyebrow">${escapeHtml(homeHero.eyebrow)}</p>
        <h1>${escapeHtml(homeHero.title)}</h1>
        <p class="lede">${escapeHtml(homeHero.lede)}</p>
        <div class="hero-actions">
          <a class="button button-primary" href="${homeHero.primaryCtaHref}">${escapeHtml(homeHero.primaryCtaLabel)}</a>
          <a class="button button-secondary" href="${homeHero.secondaryCtaHref}">${escapeHtml(homeHero.secondaryCtaLabel)}</a>
        </div>
        <div class="hero-stage-caption" data-hero-caption ${activeSlide.title || activeSlide.meta ? '' : 'hidden'}>
          <p>${escapeHtml(activeSlide.title)}</p>
          <span>${escapeHtml(activeSlide.meta)}</span>
        </div>
      </div>
    </section>
  `
}

function setupHomeHeroRotation(content) {
  const slides = Array.from(document.querySelectorAll('[data-hero-slide]'))
  if (slides.length < 2) return

  const heroItems = getHomeHeroSlides(content)
  const caption = document.querySelector('[data-hero-caption]')
  let activeIndex = 0

  const applyActiveSlide = (index) => {
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index
      slide.classList.toggle('is-active', isActive)
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true')
    })

    if (!caption) return

    const activeItem = heroItems[index] || {}
    const hasCaption = Boolean(activeItem.title || activeItem.meta)
    caption.hidden = !hasCaption
    caption.innerHTML = hasCaption
      ? `<p>${escapeHtml(activeItem.title)}</p><span>${escapeHtml(activeItem.meta)}</span>`
      : ''
  }

  window.setInterval(() => {
    activeIndex = (activeIndex + 1) % slides.length
    applyActiveSlide(activeIndex)
  }, 7000)
}

function getArtworkInquiryHref(item, defaultInquiryHref) {
  const inquiryEmail = (item.inquiryEmail || '').trim()
  if (inquiryEmail) {
    return inquiryEmail.startsWith('mailto:') ? inquiryEmail : `mailto:${inquiryEmail}`
  }

  return defaultInquiryHref || ''
}

function renderPortfolioCollections(collections, inquiryHref) {
  return collections
    .map(
      (collection) => `
        <section class="section-stack">
          <div class="section-heading portfolio-collection-heading ${renderRevealClass()}">
            <p class="eyebrow">${escapeHtml(collection.status)}</p>
            <h3>${escapeHtml(collection.title)}</h3>
            <p class="section-intro-copy">${escapeHtml(collection.description || '')}</p>
          </div>
          <div class="gallery-grid">
            ${collection.items
              .map((item, index) => {
                const metadata = [item.medium, item.dimensions, item.year].filter(Boolean).join(' · ')
                return `
                  <article
                    class="gallery-card ${renderRevealClass()}"
                    style="--reveal-delay: ${index * 70}ms"
                    tabindex="0"
                    role="button"
                    aria-label="View details for ${escapeHtml(item.title)}"
                    data-artwork-id="${escapeHtml(item.id || '')}"
                    data-collection-id="${escapeHtml(collection.id || '')}"
                    data-title="${escapeHtml(item.title || '')}"
                    data-original-path="${escapeHtml(item.originalPath || '')}"
                    data-thumbnail-path="${escapeHtml(item.thumbnailPath || '')}"
                    data-alt-text="${escapeHtml(item.altText || item.title || '')}"
                    data-caption="${escapeHtml(item.caption || '')}"
                    data-story="${escapeHtml(item.story || '')}"
                    data-year="${escapeHtml(item.year || '')}"
                    data-medium="${escapeHtml(item.medium || '')}"
                    data-dimensions="${escapeHtml(item.dimensions || '')}"
                    data-price="${escapeHtml(item.price || '')}"
                    data-inquiry-href="${escapeHtml(getArtworkInquiryHref(item, inquiryHref))}"
                  >
                    ${
                      item.thumbnailPath
                        ? `<div class="gallery-image-wrap"><img src="${item.thumbnailPath}" alt="${escapeHtml(item.altText || item.title)}" /></div>`
                        : `<div class="gallery-placeholder">Awaiting image</div>`
                    }
                    <div class="gallery-copy">
                      <h4>${escapeHtml(item.title)}</h4>
                      <p>${escapeHtml(item.caption || '')}</p>
                      <p class="gallery-meta">${escapeHtml(metadata)}</p>
                      <span class="gallery-affordance" aria-hidden="true">View details</span>
                    </div>
                  </article>
                `
              })
              .join('')}
          </div>
        </section>
      `,
    )
    .join('')
}

function renderPosts(posts) {
  return posts
    .map(
      (post, index) => `
        <article class="post ${renderRevealClass()}" style="--reveal-delay: ${index * 80}ms">
          <p class="card-eyebrow">${escapeHtml(post.publishDate || 'Draft')}</p>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.summary)}</p>
          <div class="rich-copy">${post.body}</div>
        </article>
      `,
    )
    .join('')
}

function renderEvents(items) {
  return items
    .map(
      (item, index) => `
        <article class="event ${renderRevealClass()}" style="--reveal-delay: ${index * 80}ms">
          <span>${escapeHtml(item.startDate || item.status)}</span>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml([item.venue, item.location].filter(Boolean).join(', '))}</p>
            <p>${escapeHtml(item.description)}</p>
          </div>
        </article>
      `,
    )
    .join('')
}

function getLiveStudioFeed(content) {
  return (content?.portfolio?.collections || [])
    .flatMap((collection) => (Array.isArray(collection.items) ? collection.items : []))
    .filter((item) => item?.status === 'published' && (item.originalPath || item.thumbnailPath))
    .sort((left, right) => (right.sortOrder || 0) - (left.sortOrder || 0))
    .slice(0, 3)
}

function renderLiveStudioFeed(content) {
  const items = getLiveStudioFeed(content)
  if (items.length === 0) return ''

  return `
    <section class="studio-live-feed ${renderRevealClass()}">
      <div class="section-heading studio-section-heading">
        <p class="eyebrow">Live studio feed</p>
        <h3>What is on the wall right now.</h3>
      </div>
      <div class="studio-live-grid">
        ${items
          .map(
            (item, index) => `
              <article class="studio-live-card">
                <div class="studio-live-image-wrap">
                  <img src="${item.thumbnailPath || item.originalPath}" alt="${escapeHtml(item.altText || item.title || 'Studio feed image')}" />
                  <span class="studio-live-status">Live ${index + 1}</span>
                </div>
                <div class="studio-live-copy">
                  <h4>${escapeHtml(item.title || `Studio moment ${index + 1}`)}</h4>
                  <p>${escapeHtml(item.caption || item.medium || 'Fresh from the studio wall.')}</p>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function renderStudioAtmosphereControls() {
  return `
    <section class="studio-atmosphere ${renderRevealClass()}">
      <div class="studio-atmosphere-copy">
        <p class="eyebrow">Atmosphere</p>
        <h3>Shift with the room.</h3>
        <p>
          Morning stays warm and bright. Evening moves darker and moodier. Ambient sound is optional and only starts if you enable it.
        </p>
      </div>
      <div class="studio-atmosphere-actions">
        <button class="button button-secondary sound-toggle" type="button" data-sound-toggle="off" aria-pressed="false">
          Ambient studio sound: Off
        </button>
        <p class="studio-theme-note" data-theme-note>Current mood: ${escapeHtml(getTimeTheme())}</p>
      </div>
    </section>
  `
}

function renderFeaturedBlocks(content) {
  const featuredWork = content.portfolio.collections.flatMap((collection) => collection.items).slice(0, 2)
  const featuredPosts = content.blog.posts.slice(0, 1)
  const featuredEvents = content.events.upcoming.slice(0, 2)
  const highlights = [
    ...featuredWork.map((item) => ({ title: item.title, text: item.caption || 'New work in the portfolio.' })),
    ...featuredPosts.map((post) => ({ title: post.title, text: post.summary })),
    ...featuredEvents.map((event) => ({ title: event.title, text: event.description })),
  ]

  if (highlights.length === 0) return ''

  return `
    <section class="section">
      <div class="section-featured-media">
        <img src="/media/Touch-of-Gold.jpg" alt="Touch of Gold" />
      </div>
      <div class="section-heading ${renderRevealClass()}">
        <p class="eyebrow">Fresh from the studio</p>
        <h2>Recent highlights from the managed content.</h2>
      </div>
      <div class="highlights">
        ${renderHighlights(highlights)}
      </div>
    </section>
  `
}

function renderError(error) {
  document.querySelector('#app').innerHTML = `
    <div class="site-shell">
      <section class="hero">
        <p class="eyebrow">Content error</p>
        <h1>Unable to load the site content.</h1>
        <p class="lede">${escapeHtml(error.message)}</p>
      </section>
    </div>
  `
}

function setupRevealAnimations() {
  const revealItems = document.querySelectorAll('.reveal')
  if (revealItems.length === 0) return

  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'))
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  )

  revealItems.forEach((item) => observer.observe(item))
}

function setupTimeOfDayTheme() {
  const theme = getTimeTheme()
  document.documentElement.dataset.timeTheme = theme

  const note = document.querySelector('[data-theme-note]')
  if (note) note.textContent = `Current mood: ${theme}`
}

function setupAmbientSoundToggle() {
  const toggle = document.querySelector('[data-sound-toggle]')
  if (!toggle) return

  let audioContext = null
  let masterGain = null
  let oscillator = null
  let tremolo = null
  let isOn = false

  const updateToggle = () => {
    toggle.dataset.soundToggle = isOn ? 'on' : 'off'
    toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false')
    toggle.textContent = `Ambient studio sound: ${isOn ? 'On' : 'Off'}`
  }

  const createAudio = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return false

    if (!audioContext) {
      audioContext = new AudioContextClass()
      masterGain = audioContext.createGain()
      masterGain.gain.value = 0.0001

      oscillator = audioContext.createOscillator()
      oscillator.type = 'triangle'
      oscillator.frequency.value = 196

      tremolo = audioContext.createOscillator()
      const tremoloDepth = audioContext.createGain()
      tremolo.frequency.value = 0.18
      tremoloDepth.gain.value = 0.0015

      tremolo.connect(tremoloDepth)
      tremoloDepth.connect(masterGain.gain)
      oscillator.connect(masterGain)
      masterGain.connect(audioContext.destination)

      oscillator.start()
      tremolo.start()
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    return true
  }

  toggle.addEventListener('click', async () => {
    if (!isOn) {
      const available = await createAudio().catch(() => false)
      if (!available || !audioContext || !masterGain) return
      masterGain.gain.cancelScheduledValues(audioContext.currentTime)
      masterGain.gain.linearRampToValueAtTime(0.004, audioContext.currentTime + 1.2)
      isOn = true
      updateToggle()
      return
    }

    if (audioContext && masterGain) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime)
      masterGain.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 1)
    }

    isOn = false
    updateToggle()
  })

  updateToggle()
}

function setupPageEnhancements() {
  setupTimeOfDayTheme()
  setupRevealAnimations()
  setupAmbientSoundToggle()
}

export async function renderPage(currentPage) {
  try {
    const content = await fetchContent()
    const { site } = content
    const contact = site.contact

    if (currentPage === 'home') {
      renderShell(
        site,
        contact,
        'home',
        renderHomeHero(content),
        `
          <section class="section section-two">
            <div class="section-two-media">
                <img src="/media/Touch-of-Gold.jpg" alt="Touch of Gold" />
            </div>
            <div class="section-heading ${renderRevealClass()}">
              <p class="eyebrow">${escapeHtml(site.home.overviewEyebrow)}</p>
              <h2>${escapeHtml(site.home.overviewTitle)}</h2>
            </div>
            <p class="section-intro-copy ${renderRevealClass()}">${escapeHtml(site.home.overviewText)}</p>
            <div class="card-grid">
              ${renderHomeCards(site.home.overviewCards)}
            </div>
          </section>
          ${renderFeaturedBlocks(content)}
          <section class="section section-three">
            <div class="contact-panel ${renderRevealClass()}">
              <div>
                <p class="eyebrow">${escapeHtml(site.home.futureEyebrow)}</p>
                <h2>${escapeHtml(site.home.futureTitle)}</h2>
              </div>
              <div class="contact-details">
                <p>${escapeHtml(site.home.futureText)}</p>
                <a class="button button-primary" href="${contact.emailHref}">${escapeHtml(contact.emailLabel)}</a>
              </div>
            </div>
          </section>
        `,
      )
      setupHomeHeroRotation(content)
      setupPageEnhancements()
      return
    }

    const sections = {
      about: {
        hero: site.about,
        body: `
          <section class="section">
            <div class="section-heading ${renderRevealClass()}">
              <p class="eyebrow">${escapeHtml(site.about.eyebrow)}</p>
              <h2>${escapeHtml(site.about.title)}</h2>
            </div>
            <p class="section-intro-copy ${renderRevealClass()}">${escapeHtml(site.about.body)}</p>
            <div class="highlights">
              ${renderHighlights(site.about.highlights)}
            </div>
          </section>
        `,
      },
      portfolio: {
        hero: content.portfolio.intro,
        body: `
          <section class="section portfolio-section">
            <div class="section-heading portfolio-heading ${renderRevealClass()}">
              <p class="eyebrow">${escapeHtml(content.portfolio.intro.eyebrow)}</p>
              <h2>${escapeHtml(content.portfolio.intro.title)}</h2>
            </div>
            <p class="section-intro-copy portfolio-intro ${renderRevealClass()}">${escapeHtml(content.portfolio.intro.intro)}</p>
            ${renderPortfolioCollections(content.portfolio.collections, contact.emailHref)}
          </section>
        `,
      },
      blog: {
        hero: content.blog.intro,
        body: `
          <section class="section">
            <div class="section-heading ${renderRevealClass()}">
              <p class="eyebrow">${escapeHtml(content.blog.intro.eyebrow)}</p>
              <h2>${escapeHtml(content.blog.intro.title)}</h2>
            </div>
            <p class="section-intro-copy ${renderRevealClass()}">${escapeHtml(content.blog.intro.intro)}</p>
            <div class="blog-list">
              ${renderPosts(content.blog.posts)}
            </div>
          </section>
        `,
      },
      events: {
        hero: content.events.intro,
        body: `
          <section class="section">
            <div class="section-heading ${renderRevealClass()}">
              <p class="eyebrow">${escapeHtml(content.events.intro.eyebrow)}</p>
              <h2>${escapeHtml(content.events.intro.title)}</h2>
            </div>
            <p class="section-intro-copy ${renderRevealClass()}">${escapeHtml(content.events.intro.intro)}</p>
            <div class="event-columns">
              <div>
                <h3>Upcoming</h3>
                <div class="event-list">${renderEvents(content.events.upcoming)}</div>
              </div>
              <div>
                <h3>Past</h3>
                <div class="event-list">${renderEvents(content.events.past)}</div>
              </div>
            </div>
          </section>
        `,
      },
      studio: {
        hero: content.studio.intro,
        body: `
          <section class="section studio-section">
            <div class="section-heading studio-section-heading ${renderRevealClass()}">
              <p class="eyebrow">${escapeHtml(content.studio.intro.eyebrow)}</p>
              <h2>${escapeHtml(content.studio.intro.title)}</h2>
            </div>
            <p class="section-intro-copy studio-intro-copy ${renderRevealClass()}">${escapeHtml(content.studio.intro.body)}</p>
            ${renderStudioAtmosphereControls()}
            ${renderLiveStudioFeed(content)}
            ${
              Array.isArray(content.studio.studioImages) && content.studio.studioImages.length > 0
                ? `<div class="studio-gallery">${renderStudioGallery(content.studio.studioImages)}</div>`
                : ''
            }
            <div class="studio-info ${renderRevealClass()}">
              <div class="studio-location">
                <h3>Location</h3>
                <p class="studio-address">${escapeHtml(content.studio.location.address)}</p>
                <p class="studio-city">${escapeHtml(content.studio.location.city)}</p>
                <p class="studio-direction">${escapeHtml(content.studio.location.direction)}</p>
                <p class="studio-hours">${escapeHtml(content.studio.location.hours)}</p>
                ${
                  content.studio.location.mapUrl
                    ? `<a class="button button-primary" href="${content.studio.location.mapUrl}" target="_blank" rel="noopener noreferrer">View on Map</a>`
                    : ''
                }
                ${renderMapEmbed(content.studio.location.mapEmbedSrc)}
              </div>
            </div>
            <div class="highlights">
              ${renderHighlights(content.studio.highlights)}
            </div>
          </section>
        `,
      },
      contact: {
        hero: contact,
        body: `
          <section class="section">
            <div class="contact-panel ${renderRevealClass()}">
              <div>
                <p class="eyebrow">${escapeHtml(contact.eyebrow)}</p>
                <h2>${escapeHtml(contact.title)}</h2>
              </div>
              <div class="contact-details">
                <p>${escapeHtml(contact.body)}</p>
                <a class="button button-primary" href="${contact.emailHref}">${escapeHtml(contact.emailLabel)}</a>
                <p class="contact-note">${escapeHtml(contact.note)}</p>
              </div>
            </div>
          </section>
        `,
      },
    }

    const section = sections[currentPage]
    renderShell(
      site,
      contact,
      currentPage,
      `
        <section class="page-intro ${currentPage === 'studio' ? 'studio-page-intro' : ''}">
          <p class="eyebrow">${escapeHtml(section.hero.eyebrow)}</p>
          <h1>${escapeHtml(section.hero.title)}</h1>
          <p class="lede">${escapeHtml(section.hero.intro || section.hero.body || '')}</p>
        </section>
      `,
      section.body,
    )

    setupPageEnhancements()
  } catch (error) {
    renderError(error)
  }
}
