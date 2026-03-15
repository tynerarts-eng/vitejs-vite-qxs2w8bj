import './style.css'
import heroImg from './assets/hero.png'
import siteContent from './site-content.json'

const { siteTitle, nav, hero, about, portfolio, blog, events, contact } = siteContent

document.querySelector('#app').innerHTML = `
  <div class="site-shell">
    <header class="hero" id="top">
      <nav class="topbar" aria-label="Primary">
        <a class="brand" href="#top">${siteTitle}</a>
        <div class="nav-links">
          ${nav.map((item) => `<a href="${item.href}">${item.label}</a>`).join('')}
        </div>
      </nav>

      <section class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${hero.eyebrow}</p>
          <h1>${hero.title}</h1>
          <p class="lede">${hero.lede}</p>
          <div class="hero-actions">
            <a class="button button-primary" href="${hero.primaryCtaHref}">${hero.primaryCtaLabel}</a>
            <a class="button button-secondary" href="${hero.secondaryCtaHref}">${hero.secondaryCtaLabel}</a>
          </div>
        </div>

        <div class="hero-panel" aria-label="Site preview">
          <img src="${heroImg}" alt="Abstract placeholder artwork" />
          <div class="hero-panel-copy">
            <p>${hero.panelEyebrow}</p>
            <strong>${hero.panelText}</strong>
          </div>
        </div>
      </section>
    </header>

    <main>
      <section class="section section-intro" id="about">
        <div class="section-heading">
          <p class="eyebrow">${about.eyebrow}</p>
          <h2>${about.title}</h2>
        </div>
        <p class="section-intro-copy">${about.body}</p>
        <div class="highlights">
          ${about.highlights
            .map(
              (item) => `
                <article class="highlight">
                  <h3>${item.title}</h3>
                  <p>${item.text}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="section section-cards" id="portfolio">
        <div class="section-heading">
          <p class="eyebrow">${portfolio.eyebrow}</p>
          <h2>${portfolio.title}</h2>
        </div>
        <p class="section-intro-copy">${portfolio.intro}</p>
        <div class="card-grid">
          ${portfolio.items
            .map(
              (item) => `
                <article class="card">
                  <p class="card-eyebrow">${item.label}</p>
                  <h3>${item.title}</h3>
                  <p>${item.text}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="section section-blog" id="blog">
        <div class="section-heading">
          <p class="eyebrow">${blog.eyebrow}</p>
          <h2>${blog.title}</h2>
        </div>
        <p class="section-intro-copy">${blog.intro}</p>
        <div class="blog-list">
          ${blog.posts
            .map(
              (post) => `
                <article class="post">
                  <p class="card-eyebrow">${post.date}</p>
                  <h3>${post.title}</h3>
                  <p>${post.text}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="section section-events" id="events">
        <div class="section-heading">
          <p class="eyebrow">${events.eyebrow}</p>
          <h2>${events.title}</h2>
        </div>
        <p class="section-intro-copy">${events.intro}</p>
        <div class="event-list">
          ${events.items
            .map(
              (event) => `
                <article class="event">
                  <span>${event.date}</span>
                  <div>
                    <h3>${event.name}</h3>
                    <p>${event.details}</p>
                  </div>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="section section-contact" id="contact">
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
    </main>
  </div>
`
