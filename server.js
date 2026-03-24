import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { createServer as createViteServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production')
const port = Number(process.env.PORT || 3000)
const adminRoute = process.env.ADMIN_ROUTE || '/studio-admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-admin'
const sessionSecret = process.env.SESSION_SECRET || 'change-me-session-secret'
const sessionMaxAgeMs = Number.isFinite(Number(process.env.SESSION_MAX_AGE_MS))
  ? Number(process.env.SESSION_MAX_AGE_MS)
  : 1000 * 60 * 60 * 4
const loginWindowMs = Number.isFinite(Number(process.env.ADMIN_LOGIN_WINDOW_MS))
  ? Number(process.env.ADMIN_LOGIN_WINDOW_MS)
  : 1000 * 60 * 15
const loginMaxAttempts = Number.isFinite(Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS))
  ? Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS)
  : 5
const defaultAdminPassword = 'change-me-admin'
const defaultSessionSecret = 'change-me-session-secret'
const loginAttempts = new Map()

const dataDir = path.join(__dirname, 'data')
const mediaDir = path.join(__dirname, 'public', 'media')
const originalsDir = path.join(mediaDir, 'originals')
const thumbsDir = path.join(mediaDir, 'thumbnails')
const backupsDir = path.join(__dirname, 'backups')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

const dataFiles = {
  site: path.join(dataDir, 'site-content.json'),
  portfolio: path.join(dataDir, 'portfolio.json'),
  blog: path.join(dataDir, 'blog.json'),
  events: path.join(dataDir, 'events.json'),
  studio: path.join(dataDir, 'studio.json'),
}

app.set('trust proxy', 1)

async function ensureDirectories() {
  await Promise.all([
    fs.mkdir(dataDir, { recursive: true }),
    fs.mkdir(originalsDir, { recursive: true }),
    fs.mkdir(thumbsDir, { recursive: true }),
    fs.mkdir(backupsDir, { recursive: true }),
  ])
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createId(prefix = 'item') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || createId('slug')
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url')
  return `${body}.${signature}`
}

function verifySession(token) {
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url')
  if (signature.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!session?.expiresAt || session.expiresAt <= Date.now()) return null
    return session
  } catch {
    return null
  }
}

function getRequestProtocol(req) {
  const forwardedProto = req.headers['x-forwarded-proto']
  if (typeof forwardedProto === 'string' && forwardedProto.length > 0) {
    return forwardedProto.split(',')[0].trim().toLowerCase()
  }
  return req.protocol
}

function shouldUseSecureCookies(req) {
  return getRequestProtocol(req) === 'https'
}

function serializeSessionCookie(req, token, maxAgeSeconds) {
  const parts = [
    `admin_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (shouldUseSecureCookies(req)) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

function clearSessionCookie(req, res) {
  res.setHeader('Set-Cookie', serializeSessionCookie(req, '', 0))
}

function parseCookies(req) {
  const header = req.headers.cookie
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((part) => {
      const index = part.indexOf('=')
      const key = part.slice(0, index).trim()
      const value = part.slice(index + 1).trim()
      return [key, decodeURIComponent(value)]
    }),
  )
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req)
  const session = verifySession(cookies.admin_session)
  if (!session?.authenticated) {
    clearSessionCookie(req, res)
    return res.status(401).json({ error: 'Authentication required.' })
  }
  req.session = session
  next()
}

function getClientIdentifier(req) {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

function getLoginAttemptState(key) {
  const now = Date.now()
  const existing = loginAttempts.get(key)
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + loginWindowMs }
    loginAttempts.set(key, fresh)
    return fresh
  }
  return existing
}

function recordFailedLoginAttempt(req) {
  const state = getLoginAttemptState(getClientIdentifier(req))
  state.count += 1
  return state
}

function clearFailedLoginAttempts(req) {
  loginAttempts.delete(getClientIdentifier(req))
}

function getRetryAfterSeconds(state) {
  return Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000))
}

function requireLoginCapacity(req, res, next) {
  const state = getLoginAttemptState(getClientIdentifier(req))
  if (state.count < loginMaxAttempts) return next()

  const retryAfter = getRetryAfterSeconds(state)
  res.setHeader('Retry-After', retryAfter)
  return res.status(429).json({
    error: 'Too many login attempts. Try again later.',
    retryAfter,
  })
}

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf8')
  return JSON.parse(raw)
}

async function readContent() {
  const [site, portfolio, blog, events, studio] = await Promise.all([
    readJson(dataFiles.site),
    readJson(dataFiles.portfolio),
    readJson(dataFiles.blog),
    readJson(dataFiles.events),
    readJson(dataFiles.studio),
  ])
  return { site, portfolio, blog, events, studio }
}

async function createBackup(keys) {
  if (!keys.length) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const snapshotDir = path.join(backupsDir, stamp)
  await fs.mkdir(snapshotDir, { recursive: true })
  await Promise.all(
    keys.map(async (name) => {
      const file = dataFiles[name]
      await fs.copyFile(file, path.join(snapshotDir, `${name}.json`))
    }),
  )
  return snapshotDir
}

async function writeContent(nextContent) {
  const currentContent = await readContent()
  const changedEntries = Object.entries(nextContent).filter(([key, value]) => {
    const currentSerialized = JSON.stringify(currentContent[key])
    const nextSerialized = JSON.stringify(value)
    return currentSerialized !== nextSerialized
  })

  if (changedEntries.length === 0) return

  await createBackup(changedEntries.map(([key]) => key))
  await Promise.all(
    changedEntries.map(async ([key, value]) => {
      const file = dataFiles[key]
      await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    }),
  )
}

function sortByOrder(list, fallback) {
  return [...list].sort((a, b) => {
    const orderDelta = (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
    if (orderDelta !== 0) return orderDelta
    return fallback(a, b)
  })
}

function normalizeStudioContent(studio = {}) {
  const intro = studio.intro || {}
  const location = studio.location || {}
  const highlights = Array.isArray(studio.highlights)
    ? studio.highlights
    : studio.highlights
      ? [studio.highlights]
      : []
  const studioImages = Array.isArray(studio.studioImages)
    ? studio.studioImages
    : studio.studioImages
      ? [studio.studioImages]
      : []

  return {
    intro: {
      eyebrow: intro.eyebrow || '',
      title: intro.title || '',
      body: intro.body || '',
    },
    location: {
      address: location.address || '',
      city: location.city || '',
      direction: location.direction || '',
      hours: location.hours || '',
      mapUrl: location.mapUrl || location.mapurl || '',
      mapEmbedSrc: location.mapEmbedSrc || '',
    },
    highlights: highlights.map((item) => ({
      title: item?.title || '',
      text: item?.text || '',
    })),
    studioImages: studioImages.map((image) => ({
      path: image?.path || '',
      alt: image?.alt || '',
      caption: image?.caption || '',
    })),
  }
}

function sanitizeText(value, maxLength = 5000) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function sanitizeEmail(value) {
  const email = sanitizeText(value, 320)
  if (!email) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

const portfolioItemStatuses = new Set(['draft', 'published', 'archived'])
const portfolioItemAvailability = new Set(['available', 'on hold', 'sold', 'not for sale'])

function sanitizeAllowedValue(value, allowedValues, fallback = '') {
  const normalized = sanitizeText(value, 120).toLowerCase()
  if (!normalized) return fallback
  return allowedValues.has(normalized) ? normalized : fallback
}

function normalizePortfolioItem(item = {}, defaults = {}) {
  const fallbackSortOrder = defaults.sortOrder ?? 0

  return {
    id: sanitizeText(item.id, 120) || defaults.id || createId('art'),
    collectionId: sanitizeText(item.collectionId, 120) || defaults.collectionId || '',
    title: sanitizeText(item.title, 200) || defaults.title || 'Untitled piece',
    originalPath: sanitizeText(item.originalPath, 1000) || defaults.originalPath || '',
    thumbnailPath: sanitizeText(item.thumbnailPath, 1000) || defaults.thumbnailPath || '',
    altText: sanitizeText(item.altText, 500) || defaults.altText || '',
    caption: sanitizeText(item.caption, 2000) || defaults.caption || '',
    story: sanitizeText(item.story, 8000) || defaults.story || '',
    price: sanitizeText(item.price, 120) || defaults.price || '',
    availability: sanitizeAllowedValue(item.availability, portfolioItemAvailability, defaults.availability || ''),
    inquiryEmail: sanitizeEmail(item.inquiryEmail) || defaults.inquiryEmail || '',
    year: sanitizeText(item.year, 50) || defaults.year || '',
    medium: sanitizeText(item.medium, 200) || defaults.medium || '',
    dimensions: sanitizeText(item.dimensions, 200) || defaults.dimensions || '',
    status: sanitizeAllowedValue(item.status, portfolioItemStatuses, defaults.status || 'published'),
    sortOrder: Number.isFinite(Number(item.sortOrder))
      ? Number(item.sortOrder)
      : Number.isFinite(Number(defaults.sortOrder))
        ? Number(defaults.sortOrder)
        : fallbackSortOrder,
  }
}

function normalizePortfolioContent(portfolio = {}) {
  const intro = portfolio.intro || {}
  const collections = Array.isArray(portfolio.collections) ? portfolio.collections : []

  return {
    ...portfolio,
    intro: {
      eyebrow: intro.eyebrow || '',
      title: intro.title || '',
      intro: intro.intro || '',
    },
    collections: collections.map((collection) => ({
      ...collection,
      items: Array.isArray(collection.items)
        ? collection.items.map((item, index) =>
            normalizePortfolioItem(item, {
              id: item?.id,
              collectionId: collection.id,
              title: item?.title || 'Untitled piece',
              sortOrder: (index + 1) * 10,
            }),
          )
        : [],
    })),
  }
}

function buildPublicPayload(content) {
  const normalizedPortfolio = normalizePortfolioContent(content.portfolio)
  const portfolioCollections = sortByOrder(normalizedPortfolio.collections, (a, b) => a.title.localeCompare(b.title)).map(
    (collection) => ({
      ...collection,
      items: sortByOrder(collection.items || [], (a, b) => a.title.localeCompare(b.title)).filter(
        (item) => item.status !== 'archived',
      ),
    }),
  )

  const publishedPosts = sortByOrder(content.blog.posts.filter((post) => post.published), (a, b) =>
    (b.publishDate || '').localeCompare(a.publishDate || ''),
  )

  const now = new Date().toISOString().slice(0, 10)
  const normalizedEvents = sortByOrder(content.events.events, (a, b) =>
    (a.startDate || '').localeCompare(b.startDate || ''),
  ).map((event) => {
    const derivedStatus = event.startDate && event.startDate < now ? 'past' : 'upcoming'
    return { ...event, status: event.status || derivedStatus }
  })

  return {
    ...content,
    portfolio: { ...normalizedPortfolio, collections: portfolioCollections },
    blog: { ...content.blog, posts: publishedPosts },
    events: {
      ...content.events,
      upcoming: normalizedEvents.filter((event) => event.status !== 'past'),
      past: normalizedEvents.filter((event) => event.status === 'past'),
    },
    studio: normalizeStudioContent(content.studio),
  }
}

function replaceById(list, nextItem) {
  return list.map((item) => (item.id === nextItem.id ? nextItem : item))
}

app.use(express.json({ limit: '5mb' }))
app.use('/media', express.static(mediaDir))

app.post('/api/admin/login', requireLoginCapacity, async (req, res) => {
  const { password } = req.body ?? {}
  if (password !== adminPassword) {
    recordFailedLoginAttempt(req)
    return res.status(401).json({ error: 'Incorrect password.' })
  }

  clearFailedLoginAttempts(req)
  const createdAt = Date.now()
  const token = signSession({
    authenticated: true,
    createdAt,
    expiresAt: createdAt + sessionMaxAgeMs,
  })
  res.setHeader('Set-Cookie', serializeSessionCookie(req, token, Math.floor(sessionMaxAgeMs / 1000)))
  res.json({ ok: true })
})

app.post('/api/admin/logout', (req, res) => {
  clearSessionCookie(req, res)
  res.json({ ok: true })
})

app.get('/api/admin/session', (req, res) => {
  const cookies = parseCookies(req)
  const session = verifySession(cookies.admin_session)
  if (!session) {
    clearSessionCookie(req, res)
  }
  res.json({ authenticated: Boolean(session?.authenticated) })
})

app.get('/api/public/content', async (_req, res, next) => {
  try {
    const content = await readContent()
    res.json(buildPublicPayload(content))
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/content', requireAuth, async (_req, res, next) => {
  try {
    const content = await readContent()
    res.json({
      ...content,
      studio: normalizeStudioContent(content.studio),
    })
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/site', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const nextContent = { ...current, site: req.body }
    await writeContent(nextContent)
    res.json(nextContent.site)
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/studio', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const studio = normalizeStudioContent(req.body)
    const nextContent = { ...current, studio }
    await writeContent(nextContent)
    res.json(studio)
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/blog', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const now = new Date().toISOString()
    const post = {
      id: req.body.id || createId('post'),
      title: req.body.title || 'Untitled post',
      slug: req.body.slug || slugify(req.body.title || 'untitled-post'),
      summary: req.body.summary || '',
      body: req.body.body || '<p></p>',
      publishDate: req.body.publishDate || '',
      createdAt: req.body.createdAt || now,
      updatedAt: now,
      sortOrder: Number(req.body.sortOrder || current.blog.posts.length * 10 + 10),
      published: Boolean(req.body.published),
    }
    current.blog.posts.push(post)
    await writeContent(current)
    res.status(201).json(post)
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/blog/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const existing = current.blog.posts.find((post) => post.id === req.params.id)
    if (!existing) return res.status(404).json({ error: 'Post not found.' })
    const post = { ...existing, ...req.body, updatedAt: new Date().toISOString() }
    current.blog.posts = replaceById(current.blog.posts, post)
    await writeContent(current)
    res.json(post)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/blog/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    current.blog.posts = current.blog.posts.filter((post) => post.id !== req.params.id)
    await writeContent(current)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/events', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const event = {
      id: req.body.id || createId('event'),
      title: req.body.title || 'Untitled event',
      startDate: req.body.startDate || '',
      endDate: req.body.endDate || '',
      location: req.body.location || '',
      venue: req.body.venue || '',
      description: req.body.description || '',
      status: req.body.status || 'upcoming',
      sortOrder: Number(req.body.sortOrder || current.events.events.length * 10 + 10),
    }
    current.events.events.push(event)
    await writeContent(current)
    res.status(201).json(event)
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/events/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const existing = current.events.events.find((event) => event.id === req.params.id)
    if (!existing) return res.status(404).json({ error: 'Event not found.' })
    const event = { ...existing, ...req.body }
    current.events.events = replaceById(current.events.events, event)
    await writeContent(current)
    res.json(event)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/events/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    current.events.events = current.events.events.filter((event) => event.id !== req.params.id)
    await writeContent(current)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/portfolio/collections', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const collection = {
      id: req.body.id || slugify(req.body.title || createId('collection')),
      title: req.body.title || 'Untitled collection',
      description: req.body.description || '',
      sortOrder: Number(req.body.sortOrder || current.portfolio.collections.length * 10 + 10),
      status: req.body.status || 'published',
      items: [],
    }
    current.portfolio.collections.push(collection)
    await writeContent(current)
    res.status(201).json(collection)
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/portfolio/collections/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const existing = current.portfolio.collections.find((collection) => collection.id === req.params.id)
    if (!existing) return res.status(404).json({ error: 'Collection not found.' })
    const collection = { ...existing, ...req.body, items: existing.items }
    current.portfolio.collections = replaceById(current.portfolio.collections, collection)
    await writeContent(current)
    res.json(collection)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/portfolio/collections/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    current.portfolio.collections = current.portfolio.collections.filter((collection) => collection.id !== req.params.id)
    await writeContent(current)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/portfolio/items', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const collection = current.portfolio.collections.find((entry) => entry.id === req.body.collectionId)
    if (!collection) return res.status(404).json({ error: 'Collection not found.' })

    const item = normalizePortfolioItem(req.body, {
      id: req.body.id || createId('art'),
      collectionId: collection.id,
      title: req.body.title || 'Untitled piece',
      sortOrder: collection.items.length * 10 + 10,
    })
    collection.items.push(item)
    await writeContent(current)
    res.status(201).json(item)
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/portfolio/items/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    let updated = null
    current.portfolio.collections = current.portfolio.collections.map((collection) => {
      const found = collection.items.find((item) => item.id === req.params.id)
      if (!found) return collection
      updated = normalizePortfolioItem({ ...found, ...req.body }, { ...found, collectionId: collection.id, id: found.id })
      return { ...collection, items: replaceById(collection.items, updated) }
    })

    if (!updated) return res.status(404).json({ error: 'Portfolio item not found.' })
    await writeContent(current)
    res.json(updated)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/portfolio/items/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    let removed = null
    current.portfolio.collections = current.portfolio.collections.map((collection) => {
      const match = collection.items.find((item) => item.id === req.params.id)
      if (match) removed = match
      return { ...collection, items: collection.items.filter((item) => item.id !== req.params.id) }
    })

    if (!removed) return res.status(404).json({ error: 'Portfolio item not found.' })
    await writeContent(current)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/portfolio/upload', requireAuth, upload.array('images', 20), async (req, res, next) => {
  try {
    const collectionId = req.body.collectionId
    const current = await readContent()
    const collection = current.portfolio.collections.find((entry) => entry.id === collectionId)
    if (!collection) return res.status(404).json({ error: 'Collection not found.' })

    const createdItems = []

    for (const file of req.files || []) {
      const extension = path.extname(file.originalname) || '.jpg'
      const baseName = `${Date.now()}-${slugify(path.basename(file.originalname, extension))}`
      const originalFile = path.join(originalsDir, `${baseName}${extension}`)
      const thumbFile = path.join(thumbsDir, `${baseName}.jpg`)

      await fs.writeFile(originalFile, file.buffer)
      await sharp(file.buffer).resize({ width: 1200, height: 1200, fit: 'inside' }).jpeg({ quality: 82 }).toFile(thumbFile)

      const item = {
        id: createId('art'),
        collectionId,
        title: path.basename(file.originalname, extension),
        originalPath: `/media/originals/${path.basename(originalFile)}`,
        thumbnailPath: `/media/thumbnails/${path.basename(thumbFile)}`,
        altText: path.basename(file.originalname, extension),
        sortOrder: collection.items.length * 10 + createdItems.length * 10 + 10,
      }
      createdItems.push(
        normalizePortfolioItem(item, {
          ...item,
          status: 'published',
        }),
      )
    }

    collection.items.push(...createdItems)
    await writeContent(current)
    res.status(201).json(createdItems)
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/reorder', requireAuth, async (req, res, next) => {
  try {
    const current = await readContent()
    const { type, ids, collectionId } = req.body ?? {}
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array.' })
    }
    const orderMap = new Map((ids || []).map((id, index) => [id, (index + 1) * 10]))
    const allowedTypes = new Set(['blog', 'events', 'collections', 'items'])

    if (!allowedTypes.has(type)) {
      return res.status(400).json({ error: 'Invalid reorder type.' })
    }

    if (type === 'blog') {
      current.blog.posts = current.blog.posts.map((post) => ({ ...post, sortOrder: orderMap.get(post.id) ?? post.sortOrder }))
    }

    if (type === 'events') {
      current.events.events = current.events.events.map((event) => ({
        ...event,
        sortOrder: orderMap.get(event.id) ?? event.sortOrder,
      }))
    }

    if (type === 'collections') {
      current.portfolio.collections = current.portfolio.collections.map((collection) => ({
        ...collection,
        sortOrder: orderMap.get(collection.id) ?? collection.sortOrder,
      }))
    }

    if (type === 'items') {
      current.portfolio.collections = current.portfolio.collections.map((collection) => ({
        ...collection,
        items:
          collectionId && collection.id !== collectionId
            ? collection.items
            : collection.items.map((item) => ({ ...item, sortOrder: orderMap.get(item.id) ?? item.sortOrder })),
      }))
    }

    await writeContent(current)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: error.message || 'Unexpected server error.' })
})

async function start() {
  if (isProduction) {
    if (adminPassword === defaultAdminPassword) {
      throw new Error('ADMIN_PASSWORD must be set to a non-default value in production.')
    }
    if (sessionSecret === defaultSessionSecret) {
      throw new Error('SESSION_SECRET must be set to a non-default value in production.')
    }
  }

  await ensureDirectories()
  const publicPageRoutes = ['/', '/about.html', '/portfolio.html', '/blog.html', '/events.html', '/contact.html', '/studio.html']

  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')))
    app.get(adminRoute, (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'admin.html'))
    })
    app.get(publicPageRoutes, (req, res) => {
      const target = req.path === '/' ? 'index.html' : req.path.slice(1)
      res.sendFile(path.join(__dirname, 'dist', target))
    })
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
    app.get(adminRoute, async (req, res, next) => {
      try {
        const html = await fs.readFile(path.join(__dirname, 'admin.html'), 'utf8')
        res.status(200).set({ 'Content-Type': 'text/html' }).end(await vite.transformIndexHtml(req.originalUrl, html))
      } catch (error) {
        next(error)
      }
    })
    app.get(publicPageRoutes, async (req, res, next) => {
      try {
        const target = req.path === '/' ? 'index.html' : req.path.slice(1)
        const html = await fs.readFile(path.join(__dirname, target), 'utf8')
        res.status(200).set({ 'Content-Type': 'text/html' }).end(await vite.transformIndexHtml(req.originalUrl, html))
      } catch (error) {
        next(error)
      }
    })
  }

  app.listen(port, () => {
    console.log(`Studio server running at http://localhost:${port}`)
    console.log(`Hidden admin route: ${adminRoute}`)
  })
}

start()
