import './style.css'
import { fetchContent, sendJson } from './content-api.js'

const portfolioItemStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const portfolioAvailabilityOptions = [
  { value: '', label: 'Not set' },
  { value: 'available', label: 'Available' },
  { value: 'on hold', label: 'On hold' },
  { value: 'sold', label: 'Sold' },
  { value: 'not for sale', label: 'Not for sale' },
]

const state = {
  authenticated: false,
  content: null,
  activeTab: 'site',
  collapsedCollections: {},
  portfolioModalItemId: null,
  portfolioUploadState: {},
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sortByOrder(list, fallback) {
  return [...list].sort((a, b) => {
    const orderDelta = (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
    if (orderDelta !== 0) return orderDelta
    return fallback(a, b)
  })
}

function orderedCollections() {
  return sortByOrder(state.content?.portfolio?.collections || [], (a, b) => a.title.localeCompare(b.title))
}

function orderedItems(collection) {
  return sortByOrder(collection.items || [], (a, b) => a.title.localeCompare(b.title))
}

function findPortfolioCollection(collectionId) {
  return orderedCollections().find((collection) => collection.id === collectionId) || null
}

function getUploadState(collectionId) {
  return {
    dragging: false,
    loading: false,
    tone: '',
    message: '',
    ...state.portfolioUploadState[collectionId],
  }
}

function setUploadState(collectionId, patch) {
  state.portfolioUploadState[collectionId] = {
    ...getUploadState(collectionId),
    ...patch,
  }
}

function renderSelectOptions(options, currentValue = '') {
  const knownValues = new Set(options.map((option) => option.value))
  const rendered = options.map(
    (option) =>
      `<option value="${escapeHtml(option.value)}" ${option.value === currentValue ? 'selected' : ''}>${escapeHtml(option.label)}</option>`,
  )

  if (currentValue && !knownValues.has(currentValue)) {
    rendered.push(`<option value="${escapeHtml(currentValue)}" selected>${escapeHtml(`${currentValue} (current)`)}</option>`)
  }

  return rendered.join('')
}

function moveIds(list, id, direction) {
  const index = list.findIndex((entry) => entry.id === id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return null
  const next = [...list]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  return next.map((entry) => entry.id)
}

function layout(content) {
  return `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <p class="eyebrow">Studio admin</p>
        <h1>Manage the site</h1>
        <div class="admin-nav">
          ${['site', 'studio', 'portfolio', 'blog', 'events'].map((tab) => `<button data-tab="${tab}" class="${tab === state.activeTab ? 'is-active' : ''}">${tab}</button>`).join('')}
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

function studioTab(studio) {
  const images = Array.isArray(studio.studioImages) ? studio.studioImages : []
  const highlights = Array.isArray(studio.highlights) ? studio.highlights : []
  const primaryHighlight = highlights[0] || { title: '', text: '' }

  return `
    <section class="admin-card">
      <h2>Studio page</h2>
      <form id="studioForm" class="admin-form">
        <div class="admin-form-split">
          <label>Eyebrow<input name="introEyebrow" value="${escapeHtml(studio.intro?.eyebrow || '')}" /></label>
          <label>Page title<input name="introTitle" value="${escapeHtml(studio.intro?.title || '')}" /></label>
        </div>
        <label>Intro body<textarea name="introBody">${escapeHtml(studio.intro?.body || '')}</textarea></label>
        <div class="admin-form-split">
          <label>Address<input name="address" value="${escapeHtml(studio.location?.address || '')}" /></label>
          <label>City<input name="city" value="${escapeHtml(studio.location?.city || '')}" /></label>
        </div>
        <div class="admin-form-split">
          <label>Direction<input name="direction" value="${escapeHtml(studio.location?.direction || '')}" /></label>
          <label>Hours<input name="hours" value="${escapeHtml(studio.location?.hours || '')}" /></label>
        </div>
        <label>Map link URL<input name="mapUrl" value="${escapeHtml(studio.location?.mapUrl || '')}" /></label>
        <label>Google Maps embed src
          <textarea name="mapEmbedSrc" placeholder="Paste the src value from Google Maps embed HTML">${escapeHtml(studio.location?.mapEmbedSrc || '')}</textarea>
        </label>
        <div class="admin-form-split">
          <label>Highlight title<input name="highlightTitle" value="${escapeHtml(primaryHighlight.title || '')}" /></label>
          <label>Highlight text<textarea name="highlightText">${escapeHtml(primaryHighlight.text || '')}</textarea></label>
        </div>
        <label>Studio images JSON
          <textarea name="studioImages" class="admin-code-area">${escapeHtml(JSON.stringify(images, null, 2))}</textarea>
        </label>
        <p class="admin-help">Use an array of objects with path, alt, and caption keys.</p>
        <button class="button button-primary" type="submit">Save studio content</button>
      </form>
    </section>
  `
}

function portfolioTab(portfolio) {
  const collections = sortByOrder(portfolio.collections, (a, b) => a.title.localeCompare(b.title))

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
        ${collections
          .map((collection, collectionIndex) => {
            const isCollapsed = state.collapsedCollections[collection.id] ?? false
            const itemCount = collection.items.length
            const uploadState = getUploadState(collection.id)
            const items = orderedItems(collection)

            return `
              <article class="admin-subcard">
                <div class="admin-header-row">
                  <div>
                    <h3>${escapeHtml(collection.title)}</h3>
                    <p class="admin-collection-meta">${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'}</p>
                  </div>
                  <div class="admin-inline-actions">
                    <button type="button" class="button button-secondary collectionMove" data-id="${collection.id}" data-direction="-1" ${collectionIndex === 0 ? 'disabled' : ''}>
                      Move up
                    </button>
                    <button type="button" class="button button-secondary collectionMove" data-id="${collection.id}" data-direction="1" ${collectionIndex === collections.length - 1 ? 'disabled' : ''}>
                      Move down
                    </button>
                    <button type="button" class="button button-secondary collectionToggle" data-id="${collection.id}">
                      ${isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                    <button type="button" class="button button-secondary collectionDelete" data-id="${collection.id}">Delete</button>
                  </div>
                </div>
                ${isCollapsed ? '' : `
                <form class="collectionForm admin-form" data-id="${collection.id}">
                  <div class="admin-header-row">
                    <h4>Collection details</h4>
                  </div>
                  <label>Title<input name="title" value="${escapeHtml(collection.title)}" /></label>
                  <label>Description<textarea name="description">${escapeHtml(collection.description || '')}</textarea></label>
                  <label>Status<input name="status" value="${escapeHtml(collection.status || '')}" /></label>
                  <label>Sort order<input name="sortOrder" type="number" value="${collection.sortOrder || 0}" /></label>
                  <button class="button button-primary" type="submit">Save collection</button>
                </form>
                  <div class="admin-header-row">
                    <h4>Collection items</h4>
                  </div>
                  <div class="collectionUploadZone ${uploadState.dragging ? 'is-dragging' : ''}" data-id="${collection.id}" tabindex="0">
                    <input class="collectionFileInput" data-id="${collection.id}" name="images" type="file" multiple accept="image/*" hidden />
                    <p class="collectionUploadTitle">Drop collection images here</p>
                    <p class="collectionUploadCopy">Drag files onto this panel or use the file picker.</p>
                    <div class="admin-inline-actions">
                      <button type="button" class="button button-secondary addPictureButton" data-id="${collection.id}" ${uploadState.loading ? 'disabled' : ''}>
                        ${uploadState.loading ? 'Uploading...' : 'Choose files'}
                      </button>
                    </div>
                    ${uploadState.message ? `<p class="admin-upload-note ${uploadState.tone === 'error' ? 'is-error' : 'is-success'}">${escapeHtml(uploadState.message)}</p>` : ''}
                  </div>
                <div class="admin-thumb-grid">
                  ${items
                    .map(
                      (item, itemIndex) => `
                        <div class="admin-thumb-card-shell">
                          <button type="button" class="admin-thumb-card itemEditorButton" data-id="${item.id}" aria-label="Edit ${escapeHtml(item.title)}">
                            ${
                              item.thumbnailPath
                                ? `<img class="admin-thumb" src="${item.thumbnailPath}" alt="${escapeHtml(item.altText || item.title)}" />`
                                : '<div class="gallery-placeholder">Awaiting image</div>'
                            }
                            <span class="admin-thumb-title">${escapeHtml(item.title)}</span>
                            <span class="admin-thumb-meta">${escapeHtml(item.status || 'published')}${item.availability ? ` / ${escapeHtml(item.availability)}` : ''}</span>
                          </button>
                          <div class="admin-inline-actions admin-thumb-actions">
                            <button type="button" class="button button-secondary itemMove" data-id="${item.id}" data-collection-id="${collection.id}" data-direction="-1" ${itemIndex === 0 ? 'disabled' : ''}>Up</button>
                            <button type="button" class="button button-secondary itemMove" data-id="${item.id}" data-collection-id="${collection.id}" data-direction="1" ${itemIndex === items.length - 1 ? 'disabled' : ''}>Down</button>
                          </div>
                        </div>
                      `,
                    )
                    .join('')}
                </div>
                `}
              </article>
            `
          })
          .join('')}
      </div>
    </section>
  `
}

function findPortfolioItem(itemId) {
  if (!itemId) return null
  for (const collection of orderedCollections()) {
    const item = orderedItems(collection).find((entry) => entry.id === itemId)
    if (item) return item
  }
  return null
}

function portfolioItemModal() {
  const item = findPortfolioItem(state.portfolioModalItemId)
  if (!item) return ''

  return `
    <div class="admin-modal-backdrop" data-close-modal="true">
      <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="portfolioItemModalTitle">
        <div class="admin-header-row">
          <div>
            <p class="eyebrow">Portfolio item</p>
            <h3 id="portfolioItemModalTitle">${escapeHtml(item.title)}</h3>
          </div>
          <button type="button" class="button button-secondary modalCloseButton">Close</button>
        </div>
        <form class="itemForm admin-form" data-id="${item.id}">
          <input type="hidden" name="collectionId" value="${escapeHtml(item.collectionId)}" />
          ${item.thumbnailPath ? `<img class="admin-thumb admin-modal-thumb" src="${item.thumbnailPath}" alt="${escapeHtml(item.altText || item.title)}" />` : ''}
          <label>Title<input name="title" value="${escapeHtml(item.title)}" /></label>
          <label>Alt text<input name="altText" value="${escapeHtml(item.altText || '')}" /></label>
          <label>Caption<textarea name="caption">${escapeHtml(item.caption || '')}</textarea></label>
          <label>Story<textarea name="story">${escapeHtml(item.story || '')}</textarea></label>
          <div class="admin-form-split">
            <label>Year<input name="year" value="${escapeHtml(item.year || '')}" /></label>
            <label>Price<input name="price" value="${escapeHtml(item.price || '')}" placeholder="$1,200" /></label>
          </div>
          <div class="admin-form-split">
            <label>Medium<input name="medium" value="${escapeHtml(item.medium || '')}" /></label>
            <label>Dimensions<input name="dimensions" value="${escapeHtml(item.dimensions || '')}" /></label>
          </div>
          <div class="admin-form-split">
            <label>Status
              <select name="status">${renderSelectOptions(portfolioItemStatusOptions, item.status || 'published')}</select>
            </label>
            <label>Availability
              <select name="availability">${renderSelectOptions(portfolioAvailabilityOptions, item.availability || '')}</select>
            </label>
          </div>
          <label>Sort order<input name="sortOrder" type="number" value="${item.sortOrder || 0}" /></label>
          <div class="admin-inline-actions">
            <button class="button button-primary" type="submit">Save item</button>
            <button type="button" class="button button-secondary itemDelete" data-id="${item.id}">Delete</button>
          </div>
        </form>
      </div>
    </div>
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
    studio: studioTab(content.studio),
    portfolio: portfolioTab(content.portfolio),
    blog: blogTab(content.blog),
    events: eventsTab(content.events),
  }

  document.querySelector('#app').innerHTML = `${layout(tabMarkup[state.activeTab])}${state.activeTab === 'portfolio' ? portfolioItemModal() : ''}`
  bindAdminEvents()
}

async function refresh() {
  state.content = await fetchContent(true)
  renderAdmin()
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries())
}

function isProbablyImageFile(file) {
  return Boolean(file?.type?.startsWith('image/')) || /\.(avif|bmp|gif|jpe?g|png|tiff?|webp)$/i.test(file?.name || '')
}

async function runAdminAction(task, onError) {
  try {
    return await task()
  } catch (error) {
    if (onError) onError(error)
    else window.alert(error.message || 'Request failed.')
    return null
  }
}

async function uploadFiles(collectionId, fileList) {
  const files = Array.from(fileList || []).filter(isProbablyImageFile)
  if (!files.length) {
    setUploadState(collectionId, { tone: 'error', message: 'Select image files to upload.', loading: false, dragging: false })
    renderAdmin()
    return
  }

  setUploadState(collectionId, {
    loading: true,
    dragging: false,
    tone: '',
    message: `Uploading ${files.length} ${files.length === 1 ? 'image' : 'images'}...`,
  })
  renderAdmin()

  await runAdminAction(
    async () => {
      const payload = new FormData()
      for (const file of files) {
        payload.append('images', file)
      }
      payload.set('collectionId', collectionId)

      const response = await fetch('/api/admin/portfolio/upload', { method: 'POST', body: payload })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || `Upload failed with ${response.status}`)
      }

      setUploadState(collectionId, {
        loading: false,
        tone: 'success',
        message: `Uploaded ${data.length} ${data.length === 1 ? 'image' : 'images'}.`,
      })
      state.portfolioModalItemId = data[0]?.id || null
      await refresh()
    },
    (error) => {
      setUploadState(collectionId, {
        loading: false,
        dragging: false,
        tone: 'error',
        message: error.message || 'Upload failed.',
      })
      renderAdmin()
    },
  )
}

async function submitPortfolioReorder(type, ids, extra = {}) {
  await sendJson('/api/admin/reorder', 'POST', { type, ids, ...extra })
  await refresh()
}

function bindAdminEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) =>
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab
      renderAdmin()
    }),
  )

  document.querySelector('#logoutButton')?.addEventListener('click', async () => {
    await runAdminAction(async () => {
      await sendJson('/api/admin/logout', 'POST')
      state.authenticated = false
      renderLogin()
    })
  })

  document.querySelector('#siteForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    await runAdminAction(async () => {
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
  })

  document.querySelector('#studioForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    await runAdminAction(async () => {
      const values = formToObject(event.currentTarget)
      let studioImages = []

      try {
        const parsed = JSON.parse(values.studioImages || '[]')
        studioImages = Array.isArray(parsed) ? parsed : []
      } catch {
        throw new Error('Studio images JSON must be a valid array.')
      }

      const nextStudio = {
        intro: {
          eyebrow: values.introEyebrow,
          title: values.introTitle,
          body: values.introBody,
        },
        location: {
          address: values.address,
          city: values.city,
          direction: values.direction,
          hours: values.hours,
          mapUrl: values.mapUrl,
          mapEmbedSrc: values.mapEmbedSrc,
        },
        highlights: values.highlightTitle || values.highlightText
          ? [{ title: values.highlightTitle, text: values.highlightText }]
          : [],
        studioImages,
      }

      await sendJson('/api/admin/studio', 'PUT', nextStudio)
      await refresh()
    })
  })

  document.querySelector('#newCollectionButton')?.addEventListener('click', async () => {
    await runAdminAction(async () => {
      const created = await sendJson('/api/admin/portfolio/collections', 'POST', { title: 'New collection' })
      state.collapsedCollections[created.id] = false
      await refresh()
    })
  })

  document.querySelectorAll('.collectionToggle').forEach((button) =>
    button.addEventListener('click', () => {
      const current = state.collapsedCollections[button.dataset.id] ?? false
      state.collapsedCollections[button.dataset.id] = !current
      renderAdmin()
    }),
  )

  document.querySelectorAll('.collectionMove').forEach((button) =>
    button.addEventListener('click', async () => {
      await runAdminAction(async () => {
        const ids = moveIds(orderedCollections(), button.dataset.id, Number(button.dataset.direction))
        if (!ids) return
        await submitPortfolioReorder('collections', ids)
      })
    }),
  )

  document.querySelectorAll('.collectionForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      await runAdminAction(async () => {
        const values = formToObject(event.currentTarget)
        await sendJson(`/api/admin/portfolio/collections/${form.dataset.id}`, 'PUT', {
          ...values,
          sortOrder: Number(values.sortOrder || 0),
        })
        await refresh()
      })
    }),
  )

  document.querySelectorAll('.collectionDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this collection and all of its items?')) return
      await runAdminAction(async () => {
        await sendJson(`/api/admin/portfolio/collections/${button.dataset.id}`, 'DELETE')
        await refresh()
      })
    }),
  )

  document.querySelectorAll('.addPictureButton').forEach((button) =>
    button.addEventListener('click', () => {
      document.querySelector(`.collectionFileInput[data-id="${button.dataset.id}"]`)?.click()
    }),
  )

  document.querySelectorAll('.collectionFileInput').forEach((input) =>
    input.addEventListener('change', async () => {
      if (!input.files?.length) return
      await uploadFiles(input.dataset.id, input.files)
      input.value = ''
    }),
  )

  document.querySelectorAll('.collectionUploadZone').forEach((zone) => {
    const collectionId = zone.dataset.id

    zone.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('.addPictureButton')) return
      document.querySelector(`.collectionFileInput[data-id="${collectionId}"]`)?.click()
    })

    zone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        document.querySelector(`.collectionFileInput[data-id="${collectionId}"]`)?.click()
      }
    })

    ;['dragenter', 'dragover'].forEach((eventName) =>
      zone.addEventListener(eventName, (event) => {
        event.preventDefault()
        setUploadState(collectionId, { dragging: true })
        zone.classList.add('is-dragging')
      }),
    )

    ;['dragleave', 'dragend'].forEach((eventName) =>
      zone.addEventListener(eventName, (event) => {
        event.preventDefault()
        if (event.target === zone) {
          setUploadState(collectionId, { dragging: false })
          zone.classList.remove('is-dragging')
        }
      }),
    )

    zone.addEventListener('drop', async (event) => {
      event.preventDefault()
      zone.classList.remove('is-dragging')
      setUploadState(collectionId, { dragging: false })
      const files = event.dataTransfer?.files
      if (!files?.length) {
        setUploadState(collectionId, { tone: 'error', message: 'No files were dropped.' })
        renderAdmin()
        return
      }
      await uploadFiles(collectionId, files)
    })
  })

  document.querySelectorAll('.itemEditorButton').forEach((button) =>
    button.addEventListener('click', () => {
      state.portfolioModalItemId = button.dataset.id
      renderAdmin()
    }),
  )

  document.querySelectorAll('.itemMove').forEach((button) =>
    button.addEventListener('click', async () => {
      await runAdminAction(async () => {
        const collection = findPortfolioCollection(button.dataset.collectionId)
        if (!collection) return
        const ids = moveIds(orderedItems(collection), button.dataset.id, Number(button.dataset.direction))
        if (!ids) return
        await submitPortfolioReorder('items', ids, { collectionId: collection.id })
      })
    }),
  )

  document.querySelectorAll('.itemForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      await runAdminAction(async () => {
        const values = formToObject(event.currentTarget)
        await sendJson(`/api/admin/portfolio/items/${form.dataset.id}`, 'PUT', {
          ...values,
          sortOrder: Number(values.sortOrder || 0),
        })
        state.portfolioModalItemId = form.dataset.id
        await refresh()
      })
    }),
  )

  document.querySelectorAll('.itemDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this portfolio item?')) return
      await runAdminAction(async () => {
        await sendJson(`/api/admin/portfolio/items/${button.dataset.id}`, 'DELETE')
        state.portfolioModalItemId = null
        await refresh()
      })
    }),
  )

  document.querySelector('.modalCloseButton')?.addEventListener('click', () => {
    state.portfolioModalItemId = null
    renderAdmin()
  })

  document.querySelector('.admin-modal-backdrop')?.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === 'true') {
      state.portfolioModalItemId = null
      renderAdmin()
    }
  })

  document.querySelector('#newPostButton')?.addEventListener('click', async () => {
    await runAdminAction(async () => {
      await sendJson('/api/admin/blog', 'POST', { title: 'New post', published: false })
      await refresh()
    })
  })

  document.querySelectorAll('.editor-toolbar button').forEach((button) =>
    button.addEventListener('click', () => {
      document.execCommand(button.dataset.command, false)
    }),
  )

  document.querySelectorAll('.blogForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      await runAdminAction(async () => {
        const values = formToObject(event.currentTarget)
        await sendJson(`/api/admin/blog/${form.dataset.id}`, 'PUT', {
          ...values,
          sortOrder: Number(values.sortOrder || 0),
          published: form.querySelector('[name="published"]').checked,
          body: form.querySelector('.rich-editor').innerHTML,
        })
        await refresh()
      })
    }),
  )

  document.querySelectorAll('.blogDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return
      await runAdminAction(async () => {
        await sendJson(`/api/admin/blog/${button.dataset.id}`, 'DELETE')
        await refresh()
      })
    }),
  )

  document.querySelector('#newEventButton')?.addEventListener('click', async () => {
    await runAdminAction(async () => {
      await sendJson('/api/admin/events', 'POST', { title: 'New event', status: 'upcoming' })
      await refresh()
    })
  })

  document.querySelectorAll('.eventForm').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      await runAdminAction(async () => {
        const values = formToObject(event.currentTarget)
        await sendJson(`/api/admin/events/${form.dataset.id}`, 'PUT', {
          ...values,
          sortOrder: Number(values.sortOrder || 0),
        })
        await refresh()
      })
    }),
  )

  document.querySelectorAll('.eventDelete').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return
      await runAdminAction(async () => {
        await sendJson(`/api/admin/events/${button.dataset.id}`, 'DELETE')
        await refresh()
      })
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
