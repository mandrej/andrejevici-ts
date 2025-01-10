import { defineStore, acceptHMRUpdate } from 'pinia'
import { db } from '../boot/fire'
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'
import notify from '../helpers/notify'
import { CONFIG, emailNick } from '../helpers'
import type { DocumentReference } from 'firebase/firestore'
import type { StoredItem } from '../components/models'

interface ValuesState {
  tagsToApply: string[]
  values: {
    year: { [key: string]: number }
    tags: { [key: string]: number }
    model: { [key: string]: number }
    lens: { [key: string]: number }
    email: { [key: string]: number }
  }
}

const photosCol = collection(db, 'Photo')
const countersCol = collection(db, 'Counter')

const counterId = (field: string, value: string | number): string => {
  return `Photo||${field}||${value}`
}

const byCountReverse = <T extends keyof ValuesState['values']>(
  state: ValuesState,
  field: T,
): { [key: string]: number } => {
  return Object.entries(state.values[field])
    .sort(([, a], [, b]) => b - a)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}) as { [key: string]: number }
}

export const useValuesStore = defineStore('meta', {
  state: (): ValuesState => ({
    tagsToApply: [],
    values: {
      year: {},
      tags: {},
      model: {},
      lens: {},
      email: {},
    },
  }),
  getters: {
    tagsValues: (state: ValuesState): string[] => {
      return Object.keys(state.values.tags).sort()
    },
    modelValues: (state: ValuesState): string[] => {
      return Object.keys(byCountReverse(state, 'model'))
    },
    lensValues: (state: ValuesState): string[] => {
      return Object.keys(byCountReverse(state, 'lens'))
    },
    emailValues: (state: ValuesState): string[] => {
      return Object.keys(byCountReverse(state, 'email'))
    },
    nickValues: (state: ValuesState): string[] => {
      const ret: string[] = []
      const emails = byCountReverse(state, 'email')
      Object.keys(emails).forEach((key) => {
        ret.push(emailNick(key))
      })
      return ret
    },
    yearValues: (state: ValuesState): string[] => {
      return Object.keys(state.values.year).reverse()
    },
    yearWithCount: (state: ValuesState): Array<{ value: string; count: number }> => {
      const ret: Array<{ value: string; count: number }> = []
      for (const year of Object.keys(state.values.year).reverse()) {
        ret.push({ value: year, count: state.values.year[year] || 0 })
      }
      return ret
    },
    nickWithCount(state: ValuesState): { [key: string]: number } {
      const emails = byCountReverse(state, 'email')
      return Object.keys(emails)
        .filter((key): key is string => emails[key]! > 0)
        .reduce(
          (obj, key): { [key: string]: number } => {
            obj[emailNick(key)] = emails[key]!
            return obj
          },
          {} as { [key: string]: number },
        )
    },
    tagsWithCount: (state: ValuesState): { [key: string]: number } => {
      return Object.keys(state.values.tags)
        .sort()
        .filter((key): key is string => state.values.tags[key]! > 0)
        .reduce(
          (obj, key): { [key: string]: number } => {
            const count = state.values.tags[key]
            if (count !== undefined) {
              obj[key] = count
            }
            return obj
          },
          {} as { [key: string]: number },
        )
    },
  },
  actions: {
    async fieldCount(field: 'year' | 'tags' | 'model' | 'lens' | 'email'): Promise<void> {
      const q = query(countersCol, where('field', '==', field))
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((d) => {
        const obj = d.data() as {
          count: number
          field: 'year' | 'tags' | 'model' | 'lens' | 'email'
          value: string
        }
        this.values[field][obj.value] = obj.count
      })
    },
    /**
     * Build the counter documents for all photos in the Photo collection.
     *
     * @returns {Promise<void>} Resolves when all counter documents have been written.
     */
    async countersBuild(): Promise<void> {
      notify({
        message: `Please wait`,
        actions: [{ icon: 'close' }],
        group: 'build',
      })
      const q = query(photosCol, orderBy('date', 'desc'))
      const querySnapshot = await getDocs(q)
      const val: {
        [field in 'year' | 'tags' | 'model' | 'lens' | 'email']: { [key: string]: number }
      } = {
        year: {},
        tags: {},
        model: {},
        lens: {},
        email: {},
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const year = new Date(data.date).getFullYear().toString()
        const tags = data.tags || []
        const model = data.model || 'unknown'
        const lens = data.lens || 'unknown'
        const email = data.email || 'unknown'

        val.year[year] = (val.year[year] || 0) + 1
        tags.forEach((tag: string) => {
          val.tags[tag] = (val.tags[tag] || 0) + 1
        })
        val.model[model] = (val.model[model] || 0) + 1
        val.lens[lens] = (val.lens[lens] || 0) + 1
        val.email[email] = (val.email[email] || 0) + 1
      })

      const batch = writeBatch(db)
      Object.keys(val).forEach((field) => {
        Object.keys(val[field as keyof typeof val]).forEach((value) => {
          const count = val[field as keyof typeof val][value]
          const docRef = doc(countersCol, `${field}_${value}`)
          batch.set(docRef, { field, value, count })
        })
      })

      await batch.commit()
      notify({
        message: `Counters have been built successfully`,
        actions: [{ icon: 'close' }],
        group: 'build',
      })
    },
    async increase(
      id: string,
      field: 'year' | 'tags' | 'model' | 'lens' | 'email',
      val: string | number,
    ): Promise<void> {
      let find = this.values[field][val as string]
      if (find !== undefined) {
        find++
      } else {
        this.values[field][val as string] = 1
      }

      const counterRef = doc(db, 'Counter', id)
      const oldDoc = await getDoc(counterRef)
      if (oldDoc.exists()) {
        const old = oldDoc.data() as { count: number }
        await updateDoc(counterRef, {
          count: old.count + 1,
        })
      } else {
        await setDoc(
          counterRef,
          {
            count: 1,
            field,
            value: val,
          },
          { merge: true },
        )
      }
    },
    async increaseValues(newData: StoredItem): Promise<void> {
      for (const field of CONFIG.photo_filter as Array<
        'year' | 'tags' | 'model' | 'lens' | 'email'
      >) {
        const value = newData[field]
        if (value && newData.date) {
          if (field === 'tags' && Array.isArray(value)) {
            for (const tag of value) {
              const id = counterId(field, tag)
              this.increase(id, field, tag)
            }
          } else if (typeof value === 'string' || typeof value === 'number') {
            const id = counterId(field, value)
            this.increase(id, field, '' + value)
          }
        }
      }
    },
    async decrease(
      id: string,
      field: 'year' | 'tags' | 'model' | 'lens' | 'email',
      val: string | number,
    ): Promise<void> {
      let find = this.values[field][val as string]
      if (find) {
        find--
        if (find <= 0) {
          delete this.values[field][val as string]
        }
      }

      const counterRef = doc(db, 'Counter', id)
      const oldDoc = await getDoc(counterRef)
      if (oldDoc.exists()) {
        const old = oldDoc.data() as { count: number }
        if (old.count - 1 <= 0) {
          await deleteDoc(counterRef)
        } else {
          await updateDoc(counterRef, {
            count: old.count - 1,
          })
        }
      }
    },
    async decreaseValues(oldData: StoredItem): Promise<void> {
      for (const field of CONFIG.photo_filter as Array<
        'year' | 'tags' | 'model' | 'lens' | 'email'
      >) {
        if (oldData[field]) {
          if (field === 'tags') {
            for (const tag of oldData[field] as string[]) {
              const id = counterId(field, tag)
              this.decrease(id, field, tag)
            }
          } else {
            const id = counterId(field, oldData[field] as string)
            this.decrease(id, field, oldData[field] as string)
          }
        }
      }
    },
    async removeUnusedTags(): Promise<void> {
      // delete from store
      let id, counterRef: DocumentReference
      for (const [value, count] of Object.entries(this.values.tags)) {
        if (count <= 0) {
          try {
            id = counterId('tags', value)
            counterRef = doc(db, 'Counter', id)
            await deleteDoc(counterRef)
          } finally {
            delete this.values.tags[value]
          }
        }
      }
      // delete from database
      const q = query(countersCol, where('field', '==', 'tags'))
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach(async (d) => {
        const obj = d.data()
        if (obj.count <= 0) {
          try {
            id = counterId('tags', obj.value)
            counterRef = doc(db, 'Counter', id)
            await deleteDoc(counterRef)
          } finally {
            delete this.values.tags[obj.value]
          }
        }
      })
    },
    async renameValue(
      field: 'year' | 'tags' | 'model' | 'lens' | 'email',
      oldValue: string,
      newValue: string,
    ): Promise<void> {
      const batch = writeBatch(db)
      const filter =
        field === 'tags'
          ? where(field, 'array-contains-any', [oldValue])
          : where(field, '==', oldValue)
      const q = query(photosCol, filter, orderBy('date', 'desc'))
      const querySnapshot = await getDocs(q)

      querySnapshot.forEach((d) => {
        const photoRef = doc(db, 'Photo', d.id)
        if (field === 'tags') {
          const obj = d.data()
          const idx = obj.tags.indexOf(oldValue)
          obj.tags.splice(idx, 1, newValue)
          batch.update(photoRef, { [field]: obj.tags })
        } else {
          batch.update(photoRef, { [field]: newValue })
        }
      })

      await batch.commit()

      const oldRef = doc(db, 'Counter', counterId(field, oldValue))
      const newRef = doc(db, 'Counter', counterId(field, newValue))
      const counter = await getDoc(oldRef)
      const obj = counter.data() as { count: number }

      await setDoc(
        newRef,
        {
          count: obj.count,
          field: field,
          value: newValue,
        },
        { merge: true },
      )
      await deleteDoc(oldRef)

      this.values[field][newValue] = obj.count
      delete this.values[field][oldValue]
    },
    addNewField(val: string, field: 'year' | 'tags' | 'model' | 'lens' | 'email'): void {
      this.values[field][val] = 1
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useValuesStore, import.meta.hot))
}
