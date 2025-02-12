import CONFIG from '../../config'
import { date, format } from 'quasar'
import { slugify } from 'transliteration'
import { computed } from 'vue'
import type { UploadedItem, StoredItem } from '../components/models'

export const reFilename = new RegExp(/^(.*?)(\.[^.]*)?$/) as RegExp
const { humanStorageSize } = format
const { formatDate } = date

export { CONFIG }

export const months: string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const formatBytes = (bytes: number, decimals = 2) => {
  return humanStorageSize(bytes)
}
export const formatDatum = (str: string, format = CONFIG.dateFormat) => {
  const date = new Date(str)
  return formatDate(date, format)
}
/**
 * Return a nickname for the given email address.
 * The nickname is the first part of the address before the first dot.
 * @param email The email address to generate a nickname for.
 * @returns The nickname for the email address.
 */
export const emailNick = (email: string): string => {
  const match = email.match(/[^.@]+/)
  if (!match) {
    throw new Error(`Failed to generate nickname for email: ${email}`)
  }
  return match[0]
}
export const fakeHistory = () => {
  window.history.pushState(history.state, '', history.state.current)
}
export const removeHash = () => {
  window.history.replaceState(history.state, '', history.state.current.replace(/#(.*)?/, ''))
}
/**
 * Extract the nickname from an email address.
 * The nickname is the string before the first period or at sign.
 * @param email The email address to extract the nickname from.
 * @returns The nickname extracted from the email address.
 */
export const version = computed(
  () => process.env.ANDREJEVICI_VERSION.match(/.{1,4}/g)?.join('.') ?? '',
)
/**
 * Removes an object from an array of StoredItem based on a specified property and value.
 * @param {UploadedItem[] | StoredItem[]} arr - The array of StoredItem objects to search.
 * @param {string} value - The value to match against the specified property.
 * @returns {void}
 */
export const removeByFilename = <T extends UploadedItem | StoredItem>(
  arr: T[],
  value: string,
): void => {
  const idx = arr.findIndex((it) => it.filename === value)
  if (idx > -1) arr.splice(idx, 1)
}
/**
 * Replace an object in an array of StoredItem based on a specified property and value.
 * @param {StoredItem[]} arr - The array of StoredItem objects to search.
 * @param {StoredItem} obj - The StoredItem object to replace the matched object.
 * @param {number} [op=1] - The number of elements to replace. Defaults to 1.
 * @returns {StoredItem[]} The modified array of StoredItem objects.
 */
export const changedByFilename = (
  arr: StoredItem[],
  obj: StoredItem,
  op: number = 1,
): StoredItem[] => {
  const idx = arr.findIndex((it) => it.filename === obj.filename)
  if (idx >= 0) {
    arr.splice(idx, op, obj)
  }
  return arr
}
export const textSlug = (text: string): string => {
  // return slugify(text, { replace: [[/[\.|\:|-]/g, ""]] });
  return slugify(text, {
    replace: [
      ['ш', 's'],
      ['đ', 'dj'],
      ['џ', 'dz'],
      ['ћ', 'c'],
      ['ч', 'c'],
      ['ж', 'z'],
      [/[.-::^[0-9]]+/g, ''],
    ],
  })
}
export const sliceSlug = (slug: string) => {
  const text = []
  for (const word of slug.split('-')) {
    for (let j = 3; j < word.length + 1; j++) {
      const part = word.slice(0, j)
      if (part.length > 8) break
      text.push(part)
    }
  }
  return text
}
export const U = '_'
export const fileBroken = CONFIG.fileBroken
/**
 * Return the name of the thumbnail image for the given image filename.
 * The thumbnail will be stored in the given bucket in the following path:
 * <thumbnails prefix>/<filename>_400x400.jpeg
 * @param filename of the image file
 * @returns url of the thumbnail image
 */
export const thumbName = (filename: string): string => {
  const match = filename.match(reFilename)
  if (!match) return ''
  const [, name] = match
  return [CONFIG.thumbnails, `${name}_400x400.jpeg`].join('/')
}
export const thumbUrl = (filename: string): string => {
  return [
    'https://storage.googleapis.com',
    CONFIG.firebase.storageBucket,
    thumbName(filename),
  ].join('/')
}
