import './style.css'
import heroImg from './assets/hero.png'
import siteContent from './site-content.json'

const { siteTitle, nav, home, about, portfolio, blog, events, contact, footer } = siteContent

function renderNav(currentPage) {
  return nav
    .map((item) => {
      const state = item.key === currentPage ? ' aria-current="page"' : ''
      return `<a href="${item.href}"${state}>${item.label}</a>`
    })
    .join('')
}

function renderShell({ currentPage, heroMarkup, bodyMarkup }) {
  document.querySelector('#app').innerHTML = `
    <div class="site-shell">
      <header class="hero ${currentPage === 'home' ? 'hero-home' : 'hero-subpage'}" id="top">
        <nav class="topbar" aria-label="Primary">
          <a class="brand" href="/">${siteTitle}</a>
          <div class="nav-links">
            ${renderNav(currentPage)}
          </div>
        </nav>
        ${heroMarkup}
      </header>

      <main>
        ${bodyMarkup}
      </main>

      <footer class="site-footer">
        <p>${footer.text}</p>
        <a href="${contact.emailHref}">${footer.linkLabel}</a>
      </footer>
    </div>
  `
}

function renderHomeCards(items) {
  return items
    .map(
      (item) => `
        <article class="card card-link">
          <p class="card-eyebrow">${item.eyebrow}</p>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
          <a class="text-link" href="${item.href}">${item.linkLabel}</a>
        </article>
      `,
    )
    .join('')
}

function renderHighlightGrid(items) {
  return items
    .map(
      (item) => `
        <article class="highlight">
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </article>
      `,
    )
    .join('')
}

function renderPostGrid(items) {
  return items
    .map(
      (item) => `
        <article class="post">
          <p class="card-eyebrow">${item.date}</p>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </article>
      `,
    )
    .join('')
}

function renderEventList(items) {
  return items
    .map(
      (item) => `
        <article class="event">
          <span>${item.date}</span>
          <div>
            <h3>${item.name}</h3>
            <p>${item.details}</p>
          </div>
        </article>
      `,
    )
    .join('')
}

export function renderHomePage() {
  renderShell({
    currentPage: 'home',
    heroMarkup: `
      <section class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${home.eyebrow}</p>
          <h1>${home.title}</h1>
          <p class="lede">${home.lede}</p>
          <div class="hero-actions">
            <a class="button button-primary" href="${home.primaryCtaHref}">${home.primaryCtaLabel}</a>
            <a class="button button-secondary" href="${home.secondaryCtaHref}">${home.secondaryCtaLabel}</a>
          </div>
        </div>

        <div class="hero-panel" aria-label="Site preview">
          <img src="${heroImg}" alt="Abstract placeholder artwork" />
          <div class="hero-panel-copy">
            <p>${home.panelEyebrow}</p>
            <strong>${home.panelText}</strong>
          </div>
        </div>
      </section>
    `,
    bodyMarkup: `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">${home.overviewEyebrow}</p>
          <h2>${home.overviewTitle}</h2>
        </div>
        <p class="section-intro-copy">${home.overviewText}</p>
        <div class="card-grid">
          ${renderHomeCards(home.overviewCards)}
        </div>
      </section>

      <section class="section">
        <div class="contact-panel">
          <div>
            <p class="eyebrow">${home.futureEyebrow}</p>
            <h2>${home.futureTitle}</h2>
          </div>
          <div class="contact-details">
            <p>${home.futureText}</p>
            <a class="button button-primary" href="${contact.emailHref}">${contact.emailLabel}</a>
          </div>
        </div>
      </section>
    `,
  })
}

export function renderSectionPage(sectionKey) {
  const sections = {
    about: {
      hero: about,
      body: `
        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">${about.eyebrow}</p>
            <h2>${about.title}</h2>
          </div>
          <p class="section-intro-copy">${about.body}</p>
          <div class="highlights">
            ${renderHighlightGrid(about.highlights)}
          </div>
        </section>
      `,
    },
    portfolio: {
      hero: portfolio,
      body: `
        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">${portfolio.eyebrow}</p>
            <h2>${portfolio.title}</h2>
          </div>
          <p class="section-intro-copy">${portfolio.intro}</p>
          <div class="card-grid">
            ${renderHomeCards(
              portfolio.items.map((item) => ({
                eyebrow: item.label,
                title: item.title,
                text: item.text,
                href: contact.emailHref,
                linkLabel: 'Ask about this work',
              })),
            )}
          </div>
        </section>
      `,
    },
    blog: {
      hero: blog,
      body: `
        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">${blog.eyebrow}</p>
            <h2>${blog.title}</h2>
          </div>
          <p class="section-intro-copy">${blog.intro}</p>
          <div class="blog-list">
            ${renderPostGrid(blog.posts)}
          </div>
        </section>
      `,
    },
    events: {
      hero: events,
      body: `
        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">${events.eyebrow}</p>
            <h2>${events.title}</h2>
          </div>
          <p class="section-intro-copy">${events.intro}</p>
          <div class="event-list">
            ${renderEventList(events.items)}
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
              <p class="eyebrow">${contact.eyebrow}</p>
              <h2>${contact.title}</h2>
            </div>
            <div class="contact-details">
              <p>${contact.body}</p>
              <a class="button button-primary" href="${contact.emailHref}">${contact.emailLabel}</a>
              <p class="contact-note">${contact.note}</p>
            </div>
          </div>
        </section>
      `,
    },
  }

  const section = sections[sectionKey]

  renderShell({
    currentPage: sectionKey,
    heroMarkup: `
      <section class="page-intro">
        <p class="eyebrow">${section.hero.eyebrow}</p>
        <h1>${section.hero.title}</h1>
        <p class="lede">${section.hero.intro || section.hero.body}</p>
      </section>
    `,
    bodyMarkup: section.body,
  })
}
