import { defineStore, acceptHMRUpdate } from 'pinia'
import { db, storage } from '../boot/fire'
import {
  CONFIG,
  textSlug,
  sliceSlug,
  changedByProperty,
  removeByProperty,
  thumbName,
  thumbUrl,
} from 'src/helpers'
import notify from '../helpers/notify'
import {
  doc,
  collection,
  getDoc,
  setDoc,
  query,
  where,
  startAfter,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from 'firebase/firestore'
import { ref as storageRef, getDownloadURL, deleteObject } from 'firebase/storage'
import { useValuesStore } from './values'
import type {
  QuerySnapshot,
  DocumentSnapshot,
  DocumentData,
  Query,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryDocumentSnapshot,
} from '@firebase/firestore'
import type { Find, Bucket, PhotoRecord, LastRecord } from '../components/models'

const bucketRef = doc(db, 'Bucket', 'total')
const photosCol = collection(db, 'Photo')

const getRec = (snapshot: QuerySnapshot<DocumentData>) =>
  snapshot.docs.length ? snapshot.docs[0]?.data() : null

/**
 * Checks if all elements of the target array are included in the source array.
 *
 * @param {any[]} arr - The source array.
 * @param {any[]} target - The target array.
 * @returns {boolean} True if all elements of the target array are included in the source array.
 */
const includeSub = <T>(arr: T[], target: T[]): boolean => target.every((v) => arr.includes(v))

export const useAppStore = defineStore('app', {
  state: () => ({
    bucket: {
      size: 0,
      count: 0,
    },
    find: { year: 2024, month: 1 } as Find | null,
    uploaded: [] as PhotoRecord[],
    objects: [] as PhotoRecord[],
    next: null as string | null,
    currentEdit: {} as PhotoRecord,
    markerFileName: null as string | null,
    lastRecord: {} as PhotoRecord | null,
    sinceYear: '',

    busy: false,
    error: null as string | null,
    showEdit: false,
    showConfirm: false,
    showCarousel: false,
    editMode: false,
    adminTab: 'repair',
  }),

  getters: {
    record: (state) => {
      return {
        count: state.objects.length,
      }
    },
  },

  actions: {
    async bucketRead() {
      const docSnap = await getDoc(bucketRef)
      if (docSnap.exists()) {
        this.bucket = docSnap.data() as Bucket
      } else {
        console.error('Failed to read bucket data')
      }
    },
    /**
     * Increment or decrement the bucket by the given number of bytes.
     *
     * @param num The number of bytes to add (positive) or remove (negative).
     * @returns The updated bucket, with its size property updated and its count property incremented or decremented.
     */
    async bucketDiff(num: number): Promise<Bucket> {
      if (num > 0) {
        this.bucket.size += num
        this.bucket.count++
      } else {
        this.bucket.size -= num
        this.bucket.count--
      }
      if (this.bucket.count <= 0) {
        this.bucket.size = 0
        this.bucket.count = 0
      }
      await setDoc(bucketRef, this.bucket, { merge: true })
      return this.bucket
    },
    /**
     * Calculates the total count and size of all photos in the Photo collection and updates the bucket document.
     *
     * @returns {Promise<Bucket>} The updated bucket document, with its size property set to the total size of all photos and its count property set to the total number of photos.
     */
    async bucketBuild(): Promise<Bucket> {
      const res: Bucket = {
        count: 0,
        size: 0,
      }
      const q = query(photosCol, orderBy('date', 'desc'))
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        querySnapshot.forEach((d) => {
          res.count++
          res.size += d.data().size
        })
      }
      this.bucket = { ...res }
      await setDoc(bucketRef, this.bucket, { merge: true })
      notify({ message: `Bucket size calculated` })
      return this.bucket
    },
    async fetchRecords(
      reset = false,
      invoked = '',
    ): Promise<{
      objects: PhotoRecord[]
      error: string | null
      next: string | null
    }> {
      let max = CONFIG.limit
      let searchTags: string[] | null = null
      let searchText: string[] | null = null

      if (this.busy) {
        if (process.env.DEV) console.log('SKIPPED FOR ' + invoked)
        return {
          objects: [],
          error: null,
          next: null,
        }
      }
      const filters: QueryFieldFilterConstraint[] = Object.entries(this.find as Find).map(
        ([key, val]) => {
          if (key === 'tags') {
            searchTags = val as string[]
            max *= searchTags.length
            return where(key, 'array-contains-any', val)
          } else if (key === 'text') {
            const slug = textSlug(val as string)
            const arr = sliceSlug(slug)
            searchText = arr
            max *= arr.length
            return where(key, 'array-contains-any', arr)
          } else {
            return where(key, '==', val)
          }
        },
      )
      const constraints: Array<QueryConstraint> = [...filters, orderBy('date', 'desc')]
      if (reset) this.next = null
      if (this.next) {
        const cursor: DocumentSnapshot = await getDoc(doc(db, 'Photo', this.next))
        constraints.push(startAfter(cursor))
      }
      constraints.push(limit(max))
      const q: Query = query(photosCol, ...constraints)

      this.busy = true
      try {
        const querySnapshot: QuerySnapshot = await getDocs(q)
        if (reset) this.objects.length = 0
        querySnapshot.forEach((d: QueryDocumentSnapshot) => {
          this.objects.push(d.data() as PhotoRecord)
        })
        const next: DocumentSnapshot | null =
          querySnapshot.docs[querySnapshot.docs.length - 1] || null
        if (next && next.id) {
          this.next = next.id === this.next ? null : next.id
        } else {
          this.next = null
        }
      } catch (err) {
        this.error = (err as Error).message
        this.busy = false
        return {
          objects: [] as PhotoRecord[],
          error: (err as Error).message,
          next: null,
        }
      }
      // filter by tags
      if (searchTags) {
        this.objects = this.objects.filter((d) =>
          includeSub(d.tags as string[], searchTags as string[]),
        )
      }
      // filter by text
      if (searchText) {
        this.objects = this.objects.filter((d) =>
          includeSub(d.text as string[], searchText as string[]),
        )
      }

      this.error = this.objects.length === 0 ? 'empty' : null
      this.busy = false
      if (process.env.DEV)
        console.log('FETCHED FOR ' + invoked + ' ' + JSON.stringify(this.find, null, 2))
      return {
        objects: this.objects,
        error: this.error,
        next: this.next,
      }
    },
    /**
     * Saves a photo record to the database and updates local state.
     *
     * @param {PhotoRecord} obj - The photo record object to be saved.
     * @returns {Promise<void>} A promise that resolves when the record is saved.
     */
    async saveRecord(obj: PhotoRecord): Promise<void> {
      const docRef = doc(db, 'Photo', obj.filename)
      const meta = useValuesStore()
      if (obj.thumb) {
        const oldDoc = await getDoc(docRef)
        meta.decreaseValues(oldDoc.data() as PhotoRecord)
        await setDoc(docRef, obj, { merge: true })

        changedByProperty(this.objects, 'filename', obj)
        notify({ message: `${obj.filename} updated` })
        meta.increaseValues(obj)
      } else {
        // set thumbnail url = publish
        if (process.env.DEV) {
          const thumbRef = storageRef(storage, thumbName(obj.filename))
          obj.thumb = await getDownloadURL(thumbRef)
        } else {
          obj.thumb = thumbUrl(obj.filename)
        }
        // save everything
        await setDoc(docRef, obj, { merge: true })
        changedByProperty(this.objects, 'filename', obj, 0)
        notify({ message: `${obj.filename} published` })
        // delete uploaded
        removeByProperty(this.uploaded, 'filename', obj.filename)

        this.bucketDiff(obj.size)
        meta.increaseValues(obj)
      }
    },
    /**
     * Delete a photo record from the database, and if it has a thumbnail,
     * delete the thumbnail from Google Cloud Storage.
     *
     * @param {PhotoRecord} obj - The photo record to delete.
     * @returns {Promise<void>} A promise that resolves when the record is deleted.
     */
    async deleteRecord(obj: PhotoRecord): Promise<void> {
      notify({
        group: `${obj.filename}`,
        message: `Please wait`,
      })
      if (obj.thumb) {
        const docRef = doc(db, 'Photo', obj.filename)
        const docSnap = await getDoc(docRef)
        const data = docSnap.data() as PhotoRecord
        const stoRef = storageRef(storage, obj.filename)
        const thumbRef = storageRef(storage, thumbName(obj.filename))
        await deleteDoc(docRef)
        await deleteObject(stoRef)
        await deleteObject(thumbRef)

        removeByProperty(this.objects, 'filename', obj.filename)
        const meta = useValuesStore()
        this.bucketDiff(-data.size)
        meta.decreaseValues(data)
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        })
      } else {
        const stoRef = storageRef(storage, obj.filename)
        const thumbRef = storageRef(storage, thumbName(obj.filename))
        try {
          await deleteObject(stoRef)
          await deleteObject(thumbRef)
        } finally {
          removeByProperty(this.uploaded, 'filename', obj.filename)
        }
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        })
      }
    },
    /**
     * Get the last record from the database, with its href property set
     * to the URL of the last month it was taken.
     *
     * @returns The last record, or null if there are no records.
     */
    async getLast(): Promise<LastRecord | null> {
      try {
        const constraints = [orderBy('date', 'desc'), limit(1)]
        const q = query(photosCol, ...constraints)
        const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q)
        const lastRecord = getRec(querySnapshot) as LastRecord
        if (lastRecord) {
          // Set the href property to the URL of the last month it was taken
          lastRecord.href =
            '/list?' +
            new URLSearchParams({ year: '' + lastRecord.year, month: '' + lastRecord.month })
        }
        this.lastRecord = lastRecord
        return lastRecord as LastRecord
      } catch (error) {
        console.error('Failed to get last record:', error)
        return null
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
