export interface Find {
  text?: string
  tags?: string[]
  year?: number
  month?: number
  day?: number
  model?: string
  lens?: string
  nick?: string
}
export interface Bucket {
  size: number
  count: number
}
export interface Record {
  filename: string
  headline: string
  email: string
  nick: string

  date: string
  day: number
  month: number
  year: number

  aperture?: number
  shutter?: string
  iso?: number
  model?: string
  lens?: string
  focal_length?: number
  flash?: boolean

  size: number
  tags?: string[]
  text?: string[]
  thumb?: string
  url: string
  href?: string
}
