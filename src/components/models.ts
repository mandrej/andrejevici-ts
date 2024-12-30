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
export interface ExifResult {
  date: string
  day?: number
  month?: number
  year?: number

  model: string
  lens?: string
  focal_length?: number
  aperture?: number
  shutter?: string
  iso?: number
  flash?: boolean
  dim?: [number, number]
  loc?: string
}
export interface PhotoRecord extends ExifResult {
  filename: string
  headline: string
  email: string
  nick: string

  size: number
  tags?: string[]
  text?: string[]
  thumb?: string
  url: string
}
export interface LastRecord extends PhotoRecord {
  href: string
}
export interface CounterRecord {
  count: number
  field: 'year' | 'tags' | 'model' | 'lens' | 'email'
  value: string
}
export interface userType {
  readonly uid: string
  name: string
  email: string
  isAuthorized: boolean
  isAdmin: boolean
  signedIn: Date
  askPush?: boolean
  allowPush?: boolean
}
