import './style.css'
import { fetchContent, sendJson } from './content-api.js'

const state = {
  authenticated: false,
  content: null,
  activeTab: 'site',
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function layout(content) {
  return `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <p class="eyebrow">Studio admin</p>
        <h1>Manage the site</h1>
        <div class="admin-nav">
          ${['site', 'portfolio', 'blog', 'events'].map((tab) => `<button data-tab="${tab}" class="${tab === state.activeTab ? 'is-active' : ''}">${tab}</button>`).join('')}
        </div>
        <button id="logoutButton" class="button button-secondary">Log out</button>
      </aside>
      <main class="admin-main">${content}</main>
    </div>
  `
}

function renderLogin(error = '') {
  document.querySelector('#app').innerHTML = `
    <div class="admin-login">
      <form id="loginForm" class="admin-card">
        <p class="eyebrow">Hidden endpoint</p>
        <h1>Studio Admin</h1>
        <label>
          Shared password
          <input type="password" name="password" autocomplete="current-password" required />
        </label>
        ${error ? `<p class="admin-error">${escapeHtml(error)}</p>` : ''}
        <button class="button button-primary" type="submit">Sign in</button>
      </form>
    </div>
  `

  document.querySelector('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    try {
      await sendJson('/api/admin/login', 'POST', { password: formData.get('password') })
      await boot()
    } catch (requestError) {
      renderLogin(requestError.message)
    }
  })
}

function siteTab(site) {
  return `
    <section class="admin-card">
      <h2>Home, About, Contact</h2>
      <form id="siteForm" class="admin-form">
        <label>Site title<input name="siteTitle" value="${escapeHtml(site.siteTitle)}" /></label>
        <label>Home title<textarea name="homeTitle">${escapeHtml(site.home.title)}</textarea></label>
        <label>Home lede<textarea name="homeLede">${escapeHtml(site.home.lede)}</textarea></label>
        <label>About body<textarea name="aboutBody">${escapeHtml(site.about.body)}</textarea></label>
        <label>Contact body<textarea name="contactBody">${escapeHtml(site.contact.body)}</textarea></label>
        <label>Contact email label<input name="emailLabel" value="${escapeHtml(site.contact.emailLabel)}" /></label>
        <label>Contact email href<input name="emailHref" value="${escapeHtml(site.contact.emailHref)}" /></label>
        <button class="button button-primary" type="submit">Save site content</button>
      </form>
    </section>
  `
}

function portfolioTab(portfolio) {
  return `
    <section class="admin-card">
      <div class="admin-header-row">
        <div>
          <h2>Portfolio collections</h2>
          <p>Upload images, edit metadata, and manage ordering.</p>
        </div>
        <button id="newCollectionButton" class="button button-secondary">New collection</button>
      </div>
      <div class="admin-list">
        ${portfolio.collections
          .map(
            (collection) => `
              <article class="admin-subcard">
                <form class="collectionForm admin-form" data-id="${collection.id}">
                  <div class="admin-header-row">
                    <h3>${escapeHtml(collection.title)}</h3>
                    <div class="admin-inline-actions">
                      <button type="button" class="button button-secondary collectionDelete" data-id="${collection.id}">Delete</button>
                    </div>
                  </div>
                  <label>Title<input name="title" value="${escapeHtml(collection.title)}" /></label>
                  <label>Description<textarea name="description">${escapeHtml(collection.description || '')}</textarea></label>
                  <label>Status<input name="status" value="${escapeHtml(collection.status || '')}" /></label>
                  <label>Sort order<input name="sortOrder" type="number" value="${collection.sortOrder || 0}" /></label>
                  <button class="button button-primary" type="submit">Save collection</button>
                </form>
                <form class="uploadForm admin-form" data-id="${collection.id}">
                  <label>Upload images<input name="images" type="file" multiple accept="image/*" /></label>
                  <button class="button button-secondary" type="submit">Upload and create items</button>
                </form>
                <div class="admin-list">
                  ${collection.items
                    .map(
                      (item) => `
                        <form class="itemForm admin-form admin-subcard" data-id="${item.id}">
                          <div class="admin-header-row">
                            <h4>${escapeHtml(item.title)}</h4>
                            <button type="button" class="button button-secondary itemDelete" data-id="${item.id}">Delete</button>
                          </div>
                          ${item.thumbnailPath ? `<img class="admin-thumb" src="${item.thumbnailPath}" alt="${escapeHtml(item.altText || item.title)}" />` : ''}
                          <input type="hidden" name="collectionId" value="${escapeHtml(item.collectionId)}" />
                          <label>Title<input name="title" value="${escapeHtml(item.title)}" /></label>
                          <label>Alt text<input name="altText" value="${escapeHtml(item.altText || '')}" /></label>
                          <label>Caption<textarea name="caption">${escapeHtml(item.caption || '')}</textarea></label>
                          <label>Year<input name="year" value="${escapeHtml(item.year || '')}" /></label>
                          <label>Medium<input name="medium" value="${escapeHtml(item.medium || '')}" /></label>
                          <label>Dimensions<input name="dimensions" value="${escapeHtml(item.dimensions || '')}" /></label>
                          <label>Status<input name="status" value="${escapeHtml(item.status || '')}" /></label>
                          <label>Sort order<input name="sortOrder" type="number" value="${item.sortOrder || 0}" /></label>
                          <button class="button button-primary" type="submit">Save item</button>
                        </form>
                      `,
                    )
                    .join('')}
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function blogTab(blog) {
  return `
    <section class="admin-card">
      <div class="admin-header-row">
        <div>
          <h2>Blog posts</h2>
          <p>Rich text is edited inline with a contenteditable field.</p>
        </div>
        <button id="newPostButton" class="button button-secondary">New post</button>
      </div>
      <div class="admin-list">
        ${blog.posts
          .map(
            (post) => `
              <article class="admin-subcard">
                <form class="blogForm admin-form" data-id="${post.id}">
                  <div class="admin-header-row">
                    <h3>${escapeHtml(post.title)}</h3>
                    <button type="button" class="button button-secondary blogDelete" data-id="${post.id}">Delete</button>
                  </div>
                  <label>Title<input name="title" value="${escapeHtml(post.title)}" /></label>
                  <label>Slug<input name="slug" value="${escapeHtml(post.slug)}" /></label>
                  <label>Summary<textarea name="summary">${escapeHtml(post.summary)}</textarea></label>
                  <label>Publish date<input name="publishDate" type="date" value="${escapeHtml(post.publishDate || '')}" /></label>
                  <label>Sort order<input name="sortOrder" type="number" value="${post.sortOrder || 0}" /></label>
                  <label class="admin-checkbox"><input name="published" type="checkbox" ${post.published ? 'checked' : ''} /> Published</label>
                  <label>Body</label>
                  <div class="editor-toolbar">
                    <button type="button" data-command="bold">Bold</button>
                    <button type="button" data-command="italic">Italic</button>
                    <button type="button" data-command="insertUnorderedList">Bullets</button>
                  </div>
                  <div class="rich-editor" contenteditable="true">${post.body}</div>
                  <button class="button button-primary" type="submit">Save post</button>
                </form>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function eventsTab(events) {
  return `
    <section class="admin-card">
      <div class="admin-header-row">
        <div>
          <h2>Events</h2>
          <p>Manage upcoming and past events separately with explicit status.</p>
        </div>
        <button id="newEventButton" class="button button-secondary">New event</button>
      </div>
      <div class="admin-list">
        ${events.events
          .map(
            (event) => `
              <article class="admin-subcard">
                <form class="eventForm admin-form" data-id="${event.id}">
                  <div class="admin-header-row">
                    <h3>${escapeHtml(event.title)}</h3>
                    <button type="button" class="button button-secondary eventDelete" data-id="${event.id}">Delete</button>
                  </div>
                  <label>Title<input name="title" value="${escapeHtml(event.title)}" /></label>
                  <label>Start date<input name="startDate" type="date" value="${escapeHtml(event.startDate || '')}" /></label>
                  <label>End date<input name="endDate" type="date" value="${escapeHtml(event.endDate || '')}" /></label>
                  <label>Venue<input name="venue" value="${escapeHtml(event.venue || '')}" /></label>
                  <label>Location<input name="location" value="${escapeHtml(event.location || '')}" /></label>
                  <label>Status<input name="status" value="${escapeHtml(event.status || '')}" /></label>
                  <label>Sort order<input name="sortOrder" type="number" value="${event.sortOrder || 0}" /></label>
                  <label>Description<textarea name="description">${escapeHtml(event.description || '')}</textarea></label>
                  <button class="button button-primary" type="submit">Save event</button>
                </form>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function renderAdmin() {
  const content = state.content
  const tabMarkup = {
    site: siteTab(content.site),
    portfolio: portfolioTab(content.portfolio),
    blog: blogTab(content.blog),
    events: eventsTab(content.events),
  }

  document.querySelector('#app').innerHTML = layout(tabMarkup[state.activeTab])
  bindAdminEvents()
}

async function refresh() {
  state.content = await fetchContent(true)
  renderAdmin()
}

function formToObject(form) {
  const raw = Object.fromEntries(new FormData(form).entries())
  return raw
}

function bindAdminEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) =>
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab
      renderAdmin()
    }),
  )

  document.querySelector('#logoutButton')?.addEventListener('click', async () => {
    await sendJson('/api/admin/logout', 'POST')
    state.authenticated = false
    renderLogin()
  })

  document.querySelector('#siteForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const values = formToObject(event.currentTarget)
    const nextSite = structuredClone(state.content.site)
    nextSite.siteTitle = values.siteTitle
    nextSite.home.title = values.homeTitle
    nextSite.home.lede = values.homeLede
    nextSite.about.body = values.aboutBody
    nextSite.contact.body = values.contactBody
    nextSite.contact.emailLabel = values.emailLabel
    nextSite.contact.emailHref = values.emailHref
    await sendJson('/api/admin/site', 'PUT', nextSite)
    await refresh()
  })

  document.querySelector('#newCollectionButton')?.addEventListener('click', async () => {
    await sendJson('/api/admin/portfolio/collections', 'POST', { title: 'New collection' })
    await refresh()
  })

  document.querySelectorAll('.collectionForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const values = formToObject(event.currentTarget)
      await sendJson(`/api/admin/portfolio/collections/${form.dataset.id}`, 'PUT', {
        ...values,
        sortOrder: Number(values.sortOrder || 0),
      })
      await refresh()
    }),
  )

  document.querySelectorAll('.collectionDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this collection and all of its items?')) return
      await sendJson(`/api/admin/portfolio/collections/${button.dataset.id}`, 'DELETE')
      await refresh()
    }),
  )

  document.querySelectorAll('.uploadForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const payload = new FormData(form)
      payload.set('collectionId', form.dataset.id)
      const response = await fetch('/api/admin/portfolio/upload', { method: 'POST', body: payload })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Upload failed with ${response.status}`)
      }
      await refresh()
    }),
  )

  document.querySelectorAll('.itemForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const values = formToObject(event.currentTarget)
      await sendJson(`/api/admin/portfolio/items/${form.dataset.id}`, 'PUT', {
        ...values,
        sortOrder: Number(values.sortOrder || 0),
      })
      await refresh()
    }),
  )

  document.querySelectorAll('.itemDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this portfolio item?')) return
      await sendJson(`/api/admin/portfolio/items/${button.dataset.id}`, 'DELETE')
      await refresh()
    }),
  )

  document.querySelector('#newPostButton')?.addEventListener('click', async () => {
    await sendJson('/api/admin/blog', 'POST', { title: 'New post', published: false })
    await refresh()
  })

  document.querySelectorAll('.editor-toolbar button').forEach((button) =>
    button.addEventListener('click', () => {
      document.execCommand(button.dataset.command, false)
    }),
  )

  document.querySelectorAll('.blogForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const values = formToObject(event.currentTarget)
      await sendJson(`/api/admin/blog/${form.dataset.id}`, 'PUT', {
        ...values,
        sortOrder: Number(values.sortOrder || 0),
        published: form.querySelector('[name="published"]').checked,
        body: form.querySelector('.rich-editor').innerHTML,
      })
      await refresh()
    }),
  )

  document.querySelectorAll('.blogDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return
      await sendJson(`/api/admin/blog/${button.dataset.id}`, 'DELETE')
      await refresh()
    }),
  )

  document.querySelector('#newEventButton')?.addEventListener('click', async () => {
    await sendJson('/api/admin/events', 'POST', { title: 'New event', status: 'upcoming' })
    await refresh()
  })

  document.querySelectorAll('.eventForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const values = formToObject(event.currentTarget)
      await sendJson(`/api/admin/events/${form.dataset.id}`, 'PUT', {
        ...values,
        sortOrder: Number(values.sortOrder || 0),
      })
      await refresh()
    }),
  )

  document.querySelectorAll('.eventDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return
      await sendJson(`/api/admin/events/${button.dataset.id}`, 'DELETE')
      await refresh()
    }),
  )
}

async function boot() {
  const session = await fetch('/api/admin/session').then((response) => response.json())
  if (!session.authenticated) {
    renderLogin()
    return
  }

  state.authenticated = true
  await refresh()
}

boot().catch((error) => renderLogin(error.message))
