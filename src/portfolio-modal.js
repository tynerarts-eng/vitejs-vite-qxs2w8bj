function getGalleryCards() {
  return Array.from(document.querySelectorAll('.gallery-card[data-artwork-id]'))
}

function readArtworkFromCard(card) {
  const { dataset } = card
  return {
    id: dataset.artworkId || '',
    collectionId: dataset.collectionId || '',
    title: dataset.title || 'Untitled piece',
    originalPath: dataset.originalPath || '',
    thumbnailPath: dataset.thumbnailPath || '',
    altText: dataset.altText || dataset.title || 'Artwork',
    caption: dataset.caption || '',
    year: dataset.year || '',
    medium: dataset.medium || '',
    dimensions: dataset.dimensions || '',
    inquiryHref: dataset.inquiryHref || '',
  }
}

export function enablePortfolioImageModal() {
  if (!window.location.pathname.includes('portfolio')) return

  let backdrop = null
  let currentIndex = -1
  let lastFocusedElement = null
  let keydownHandler = null

  const cards = getGalleryCards()
  if (cards.length === 0) return

  const artworks = cards.map(readArtworkFromCard)

  function closeViewer() {
    if (!backdrop) return

    backdrop.classList.remove('is-visible')
    document.body.classList.remove('portfolio-viewer-open')

    window.setTimeout(() => {
      backdrop?.remove()
      backdrop = null
    }, 220)

    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler)
      keydownHandler = null
    }

    lastFocusedElement?.focus?.()
    lastFocusedElement = null
    currentIndex = -1
  }

  function moveToIndex(nextIndex) {
    if (!backdrop || nextIndex < 0 || nextIndex >= artworks.length) return
    currentIndex = nextIndex

    const artwork = artworks[currentIndex]
    const title = backdrop.querySelector('[data-viewer-title]')
    const meta = backdrop.querySelector('[data-viewer-meta]')
    const story = backdrop.querySelector('[data-viewer-story]')
    const storyBlock = backdrop.querySelector('[data-viewer-story-block]')
    const image = backdrop.querySelector('[data-viewer-image]')
    const counter = backdrop.querySelector('[data-viewer-counter]')
    const inquire = backdrop.querySelector('[data-viewer-inquire]')
    const prevButton = backdrop.querySelector('[data-viewer-prev]')
    const nextButton = backdrop.querySelector('[data-viewer-next]')

    title.textContent = artwork.title

    const metaParts = [
      artwork.year && { label: 'Year', value: artwork.year },
      artwork.medium && { label: 'Medium', value: artwork.medium },
      artwork.dimensions && { label: 'Dimensions', value: artwork.dimensions },
    ].filter(Boolean)

    meta.innerHTML = ''
    if (metaParts.length === 0) {
      const emptyMeta = document.createElement('p')
      emptyMeta.className = 'artwork-viewer-meta-empty'
      emptyMeta.textContent = 'Details coming soon.'
      meta.appendChild(emptyMeta)
    } else {
      metaParts.forEach((item) => {
        const row = document.createElement('div')
        row.className = 'artwork-viewer-meta-row'

        const label = document.createElement('span')
        label.className = 'artwork-viewer-meta-label'
        label.textContent = item.label

        const value = document.createElement('span')
        value.className = 'artwork-viewer-meta-value'
        value.textContent = item.value

        row.append(label, value)
        meta.appendChild(row)
      })
    }

    if (artwork.caption) {
      story.textContent = artwork.caption
      storyBlock.hidden = false
    } else {
      story.textContent = ''
      storyBlock.hidden = true
    }

    image.src = artwork.originalPath || artwork.thumbnailPath
    image.alt = artwork.altText || artwork.title

    counter.textContent = `${currentIndex + 1} / ${artworks.length}`
    inquire.href = artwork.inquiryHref || 'mailto:'
    inquire.setAttribute('aria-label', `Inquire about ${artwork.title}`)

    prevButton.disabled = currentIndex === 0
    nextButton.disabled = currentIndex === artworks.length - 1
  }

  function openViewer(index, sourceCard) {
    if (index < 0 || index >= artworks.length) return

    if (backdrop) {
      moveToIndex(index)
      return
    }

    currentIndex = index
    lastFocusedElement = sourceCard

    backdrop = document.createElement('div')
    backdrop.className = 'artwork-viewer-backdrop'

    const dialog = document.createElement('section')
    dialog.className = 'artwork-viewer'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-labelledby', 'artwork-viewer-title')

    const closeButton = document.createElement('button')
    closeButton.className = 'artwork-viewer-close'
    closeButton.type = 'button'
    closeButton.setAttribute('aria-label', 'Close artwork viewer')
    closeButton.textContent = 'Close'

    const prevButton = document.createElement('button')
    prevButton.className = 'artwork-viewer-nav artwork-viewer-nav-prev'
    prevButton.type = 'button'
    prevButton.dataset.viewerPrev = 'true'
    prevButton.setAttribute('aria-label', 'View previous artwork')
    prevButton.textContent = 'Prev'

    const nextButton = document.createElement('button')
    nextButton.className = 'artwork-viewer-nav artwork-viewer-nav-next'
    nextButton.type = 'button'
    nextButton.dataset.viewerNext = 'true'
    nextButton.setAttribute('aria-label', 'View next artwork')
    nextButton.textContent = 'Next'

    const media = document.createElement('div')
    media.className = 'artwork-viewer-media'

    const image = document.createElement('img')
    image.className = 'artwork-viewer-image'
    image.dataset.viewerImage = 'true'
    media.appendChild(image)

    const panel = document.createElement('div')
    panel.className = 'artwork-viewer-panel'

    const panelTop = document.createElement('div')
    panelTop.className = 'artwork-viewer-panel-top'

    const counter = document.createElement('p')
    counter.className = 'artwork-viewer-counter'
    counter.dataset.viewerCounter = 'true'

    const title = document.createElement('h2')
    title.className = 'artwork-viewer-title'
    title.id = 'artwork-viewer-title'
    title.dataset.viewerTitle = 'true'

    const meta = document.createElement('div')
    meta.className = 'artwork-viewer-meta'
    meta.dataset.viewerMeta = 'true'

    const storyBlock = document.createElement('div')
    storyBlock.className = 'artwork-viewer-story-block'
    storyBlock.dataset.viewerStoryBlock = 'true'

    const storyLabel = document.createElement('p')
    storyLabel.className = 'artwork-viewer-story-label'
    storyLabel.textContent = 'Story'

    const story = document.createElement('p')
    story.className = 'artwork-viewer-story'
    story.dataset.viewerStory = 'true'

    storyBlock.append(storyLabel, story)

    const inquire = document.createElement('a')
    inquire.className = 'button button-primary artwork-viewer-inquire'
    inquire.dataset.viewerInquire = 'true'
    inquire.textContent = 'Inquire'

    panelTop.append(counter, title)
    panel.append(panelTop, meta, storyBlock, inquire)
    dialog.append(closeButton, prevButton, media, panel, nextButton)
    backdrop.appendChild(dialog)
    document.body.appendChild(backdrop)
    document.body.classList.add('portfolio-viewer-open')

    requestAnimationFrame(() => {
      backdrop?.classList.add('is-visible')
    })

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeViewer()
    })
    closeButton.addEventListener('click', closeViewer)
    prevButton.addEventListener('click', () => moveToIndex(currentIndex - 1))
    nextButton.addEventListener('click', () => moveToIndex(currentIndex + 1))

    keydownHandler = (event) => {
      if (!backdrop) return
      if (event.key === 'Escape') {
        event.preventDefault()
        closeViewer()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveToIndex(currentIndex - 1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveToIndex(currentIndex + 1)
      }
    }

    document.addEventListener('keydown', keydownHandler)
    moveToIndex(index)
    closeButton.focus()
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest('.gallery-card[data-artwork-id]')
    if (!card) return

    const index = cards.indexOf(card)
    if (index === -1) return

    openViewer(index, card)
  })

  document.addEventListener('keydown', (event) => {
    const card = event.target.closest?.('.gallery-card[data-artwork-id]')
    if (!card) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    const index = cards.indexOf(card)
    if (index === -1) return

    openViewer(index, card)
  })
}
