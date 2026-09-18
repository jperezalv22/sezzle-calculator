import type { MouseEvent } from 'react'

/**
 * onMouseDown for keys: a clicked button would keep focus, and Enter on a
 * focused button presses it again instead of meaning =. Tab still focuses.
 */
export function noMouseFocus(event: MouseEvent) {
  event.preventDefault()
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}
