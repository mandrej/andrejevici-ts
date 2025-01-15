import { nextTick } from 'vue'
import { scroll } from 'quasar'
import { reFilename, fakeHistory, removeHash } from './index'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'

// initialize the pinia store
import App from '../App.vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

const pinia = createPinia()
const APP = createApp(App)
APP.use(pinia)

const app = useAppStore()
const meta = useValuesStore()
import notify from '../helpers/notify'
const { getScrollTarget, setVerticalScrollPosition } = scroll

// used in Browser-Page, Add-Page
/**
 * Show the carousel with the given filename.
 * @param filename filename of the photo to show in the carousel
 */
export function useCarouselShow(filename: string): void {
  app.markerFileName = filename
  fakeHistory()
  app.showCarousel = true
}
/**
 * Cancels the carousel and scrolls to the element matching the given hash.
 * @param {string} hash - A string containing the hash with the filename of the photo
 */
export function useCarouselCancel(hash: string): void {
  const match: RegExpMatchArray | null = hash.match(reFilename)
  if (!match) {
    removeHash()
    app.busy = false
    return
  }
  const [, id]: string[] = match
  app.busy = true
  nextTick((): void => {
    if (typeof id !== 'string') {
      removeHash()
      app.busy = false
      return
    }
    const el: HTMLElement | null = document.getElementById(id)
    if (!el) return
    const target: Window | Element = getScrollTarget(el)
    setVerticalScrollPosition(target, el.offsetTop, 400)
    removeHash()
    app.busy = false
  })
}
/**
 * Renames a value in the specified field if conditions are met.
 * @param field - The field to update. Must be one of 'year', 'tags', 'model', 'lens', or 'email'.
 * @param existing - The existing value to be renamed.
 * @param changed - The new value to rename to.
 * @returns A promise that resolves when the renaming operation is complete.
 */
export const rename = async (
  field: 'year' | 'tags' | 'model' | 'lens' | 'email',
  existing: string,
  changed: string,
): Promise<void> => {
  if (existing !== '' && changed !== '') {
    if (
      (field === 'tags' && existing === 'flash') ||
      (field === 'model' && existing === 'UNKNOWN')
    ) {
      notify({
        type: 'warning',
        message: `Cannot change "${existing}"`,
      })
    } else if (Object.keys(meta.values[field]).indexOf(changed) !== -1) {
      notify({
        type: 'warning',
        message: `"${changed}" already exists"`,
      })
    } else {
      await meta.renameValue(field, existing, changed)
      notify({
        message: `${existing} successfully renamed to ${changed}`,
      })
    }
  }
}
