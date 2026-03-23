// Handles portfolio thumbnail click to show full image in a modal
export function enablePortfolioImageModal() {
  // Only run on portfolio page
  if (!window.location.pathname.includes('portfolio')) return

  // Delegate click event to gallery images
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.gallery-card img')
    if (!img) return
    const fullSrc = img.src.replace('/thumbnails/', '/originals/')
    showImageModal(fullSrc, img.alt)
  })
}

function showImageModal(src, alt) {
  // Remove any existing modal
  document.querySelectorAll('.image-modal-backdrop').forEach((el) => el.remove())
  // Create modal elements
  const backdrop = document.createElement('div')
  backdrop.className = 'image-modal-backdrop'
  backdrop.innerHTML = `
    <div class="image-modal" role="dialog" aria-modal="true">
      <button class="image-modal-close" aria-label="Close">&times;</button>
      <img src="${src}" alt="${alt}" />
    </div>
  `
  document.body.appendChild(backdrop)
  // Close on click or escape
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.classList.contains('image-modal-close')) backdrop.remove()
  })
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      backdrop.remove()
      document.removeEventListener('keydown', esc)
    }
  })
}
