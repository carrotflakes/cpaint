import { pushToast } from '@/components/Toasts'
import { loadFile } from '@/store/loadFile'

function clearOpenParamFromUrl() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('open')) {
    return
  }
  url.searchParams.delete('open')
  window.history.replaceState(window.history.state, '', url.toString())
}

export async function openImageFromQuery() {
  const open = new URLSearchParams(window.location.search).get('open')
  if (!open) {
    return
  }

  let imageUrl: URL
  try {
    imageUrl = new URL(open, window.location.href)
  } catch {
    pushToast('Invalid open URL', { type: 'error' })
    return
  }

  if (!['http:', 'https:'].includes(imageUrl.protocol)) {
    pushToast('Only http(s) URLs are supported for open', { type: 'error' })
    return
  }

  try {
    const response = await fetch(imageUrl.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const nameFromPath = imageUrl.pathname.split('/').pop() || 'image'
    const filename = decodeURIComponent(nameFromPath)
    const type = blob.type || 'application/octet-stream'
    const file = new File([blob], filename, { type })
    await loadFile(file)
  } catch (e) {
    pushToast('Failed to load open URL image: ' + e, { type: 'error' })
  } finally {
    clearOpenParamFromUrl()
  }
}
