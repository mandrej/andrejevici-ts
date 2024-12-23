import CONFIG from './config'
import { computed } from 'vue'

const reFilename = new RegExp(/^(.*?)(\.[^.]*)?$/) as RegExp

export const thumbName = (filename: string): string => {
  const [, name] = filename.match(reFilename) as string[]
  return [CONFIG.thumbnails, name + '_400x400.jpeg'].join('/')
}
export const thumbUrl = (filename: string): string => {
  return [
    'https://storage.googleapis.com',
    CONFIG.firebase.storageBucket,
    thumbName(filename),
  ].join('/')
}

export const version = computed(
  () => process.env.ANDREJEVICI_VERSION.match(/.{1,4}/g)?.join('.') ?? '',
)
