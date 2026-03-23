import { renderPage } from './render-page.js'
import { enablePortfolioImageModal } from './portfolio-modal.js'

renderPage('portfolio').then(() => {
	enablePortfolioImageModal()
})
