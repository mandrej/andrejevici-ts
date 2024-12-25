import CONFIG from './config'
import { date, format } from 'quasar'
import { computed } from 'vue'

const reFilename = new RegExp(/^(.*?)(\.[^.]*)?$/) as RegExp
const { humanStorageSize } = format
const { formatDate } = date

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const formatBytes = (bytes: number, decimals = 2) => {
  return humanStorageSize(bytes)
}
export const formatDatum = (str: string, format = CONFIG.dateFormat) => {
  const date = new Date(str)
  return formatDate(date, format)
}

export const version = computed(
  () => process.env.ANDREJEVICI_VERSION.match(/.{1,4}/g)?.join('.') ?? '',
)
