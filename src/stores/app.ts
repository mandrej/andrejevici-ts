import { defineStore, acceptHMRUpdate } from 'pinia'
import { db } from '../boot/fire'
import { doc, collection, getDoc, query, orderBy, limit, getDocs } from 'firebase/firestore'
import type { QuerySnapshot, DocumentData } from '@firebase/firestore'
import type { Find, Bucket, PhotoRecord, LastRecord } from '../components/models'

const bucketRef = doc(db, 'Bucket', 'total')
const photosCol = collection(db, 'Photo')

const getRec = (snapshot: QuerySnapshot<DocumentData>) =>
  snapshot.docs.length ? snapshot.docs[0]?.data() : null

export const useAppStore = defineStore('app', {
  state: () => ({
    bucket: {
      size: 0,
      count: 0,
    },
    find: {} as Find | null,
    lastRecord: {} as PhotoRecord | null,
  }),

  getters: {},

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
