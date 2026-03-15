import './style.css'
import heroImg from './assets/hero.png'
import { fetchContent } from './content-api.js'

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderNav(site, currentPage) {
  return site.nav
    .map((item) => {
      const state = item.key === currentPage ? ' aria-current="page"' : ''
      return `<a href="${item.href}"${state}>${escapeHtml(item.label)}</a>`
    })
    .join('')
}

function renderShell(site, contact, currentPage, heroMarkup, bodyMarkup) {
  document.querySelector('#app').innerHTML = `
    <div class="site-shell">
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
        <a href="${contact.emailHref}">${escapeHtml(site.footer.linkLabel)}</a>
      </footer>
    </div>
  `
}

function renderHomeCards(items) {
  return items
    .map(
      (item) => `
        <article class="card card-link">
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
  return items
    .map(
      (item) => `
        <article class="highlight">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text)}</p>
        </article>
      `,
    )
    .join('')
}

function renderPortfolioCollections(collections) {
  return collections
    .map(
      (collection) => `
        <section class="section-stack">
          <div class="section-heading">
            <p class="eyebrow">${escapeHtml(collection.status)}</p>
            <h3>${escapeHtml(collection.title)}</h3>
            <p class="section-intro-copy">${escapeHtml(collection.description || '')}</p>
          </div>
          <div class="gallery-grid">
            ${collection.items
              .map(
                (item) => `
                  <article class="gallery-card">
                    ${
                      item.thumbnailPath
                        ? `<img src="${item.thumbnailPath}" alt="${escapeHtml(item.altText || item.title)}" />`
                        : `<div class="gallery-placeholder">Awaiting image</div>`
                    }
                    <div class="gallery-copy">
                      <h4>${escapeHtml(item.title)}</h4>
                      <p>${escapeHtml(item.caption || '')}</p>
                      <p class="gallery-meta">${escapeHtml(
                        [item.medium, item.dimensions, item.year].filter(Boolean).join(' · '),
                      )}</p>
                    </div>
                  </article>
                `,
              )
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
      (post) => `
        <article class="post">
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
      (item) => `
        <article class="event">
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
      <div class="section-heading">
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
        `
          <section class="hero-grid">
            <div class="hero-copy">
              <p class="eyebrow">${escapeHtml(site.home.eyebrow)}</p>
              <h1>${escapeHtml(site.home.title)}</h1>
              <p class="lede">${escapeHtml(site.home.lede)}</p>
              <div class="hero-actions">
                <a class="button button-primary" href="${site.home.primaryCtaHref}">${escapeHtml(site.home.primaryCtaLabel)}</a>
                <a class="button button-secondary" href="${site.home.secondaryCtaHref}">${escapeHtml(site.home.secondaryCtaLabel)}</a>
              </div>
            </div>

            <div class="hero-panel" aria-label="Site preview">
              <img src="${heroImg}" alt="Abstract placeholder artwork" />
              <div class="hero-panel-copy">
                <p>${escapeHtml(site.home.panelEyebrow)}</p>
                <strong>${escapeHtml(site.home.panelText)}</strong>
              </div>
            </div>
          </section>
        `,
        `
          <section class="section">
            <div class="section-heading">
              <p class="eyebrow">${escapeHtml(site.home.overviewEyebrow)}</p>
              <h2>${escapeHtml(site.home.overviewTitle)}</h2>
            </div>
            <p class="section-intro-copy">${escapeHtml(site.home.overviewText)}</p>
            <div class="card-grid">
              ${renderHomeCards(site.home.overviewCards)}
            </div>
          </section>
          ${renderFeaturedBlocks(content)}
          <section class="section">
            <div class="contact-panel">
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
      return
    }

    const sections = {
      about: {
        hero: site.about,
        body: `
          <section class="section">
            <div class="section-heading">
              <p class="eyebrow">${escapeHtml(site.about.eyebrow)}</p>
              <h2>${escapeHtml(site.about.title)}</h2>
            </div>
            <p class="section-intro-copy">${escapeHtml(site.about.body)}</p>
            <div class="highlights">
              ${renderHighlights(site.about.highlights)}
            </div>
          </section>
        `,
      },
      portfolio: {
        hero: content.portfolio.intro,
        body: `
          <section class="section">
            <div class="section-heading">
              <p class="eyebrow">${escapeHtml(content.portfolio.intro.eyebrow)}</p>
              <h2>${escapeHtml(content.portfolio.intro.title)}</h2>
            </div>
            <p class="section-intro-copy">${escapeHtml(content.portfolio.intro.intro)}</p>
            ${renderPortfolioCollections(content.portfolio.collections)}
          </section>
        `,
      },
      blog: {
        hero: content.blog.intro,
        body: `
          <section class="section">
            <div class="section-heading">
              <p class="eyebrow">${escapeHtml(content.blog.intro.eyebrow)}</p>
              <h2>${escapeHtml(content.blog.intro.title)}</h2>
            </div>
            <p class="section-intro-copy">${escapeHtml(content.blog.intro.intro)}</p>
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
            <div class="section-heading">
              <p class="eyebrow">${escapeHtml(content.events.intro.eyebrow)}</p>
              <h2>${escapeHtml(content.events.intro.title)}</h2>
            </div>
            <p class="section-intro-copy">${escapeHtml(content.events.intro.intro)}</p>
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
      contact: {
        hero: contact,
        body: `
          <section class="section">
            <div class="contact-panel">
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
        <section class="page-intro">
          <p class="eyebrow">${escapeHtml(section.hero.eyebrow)}</p>
          <h1>${escapeHtml(section.hero.title)}</h1>
          <p class="lede">${escapeHtml(section.hero.intro || section.hero.body || '')}</p>
        </section>
      `,
      section.body,
    )
  } catch (error) {
    renderError(error)
  }
}
