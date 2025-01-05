import { db, storage } from '../boot/fire'
import { doc, collection, query, orderBy, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import { has } from 'lodash'
import { textSlug, sliceSlug } from '../helpers'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { emailNick } from '.'
import { useRouter } from 'vue-router'
import notify from './notify'

const app = useAppStore()
const auth = useUserStore()
const router = useRouter()
const photosCol = collection(db, 'Photo')
import type { PhotoRecord } from '../components/models'

import type { DocumentData, QuerySnapshot } from 'firebase/firestore'

/**
 * Fixes records in the Photo collection that are missing the 'text' field.
 * Updates the records by generating a 'text' field from the 'headline'.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export const fix = async (): Promise<void> => {
  let num = 0
  const q = query(photosCol, orderBy('date', 'desc'))
  const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q)

  querySnapshot.forEach(async (it) => {
    const rec: DocumentData = it.data()
    if (!has(rec, 'text')) {
      const docRef = doc(db, 'Photo', rec.filename as string)
      const slug = textSlug(rec.headline as string)
      rec.text = sliceSlug(slug)
      notify({
        message: `Fixed ${++num} records`,
        group: 'fix',
      })
      await setDoc(docRef, rec, { merge: true })
    }
  })
  if (num === 0) {
    notify({
      message: `No records to fix`,
      group: 'fix',
    })
  }
}

/**
 * Gets the metadata and download URL for a file in the default Google Cloud
 * Storage bucket.
 * @param {string} filename - The name of the file to retrieve.
 * @returns {Promise<PhotoRecord>} - A promise that resolves with the file metadata and download URL.
 */
const getStorageData = async (filename: string): Promise<PhotoRecord> => {
  const _ref = storageRef(storage, filename)
  const downloadURL = await getDownloadURL(_ref)
  const metadata = await getMetadata(_ref)
  if (downloadURL) {
    return {
      url: downloadURL,
      filename: filename,
      size: metadata.size || 0,
      email: auth.user!.email,
      nick: emailNick(auth.user!.email),
    }
  } else {
    throw new Error(`getStorageData: Unable to retrieve ${filename}`)
  }
}

/**
 * Finds records in the Photo collection that are missing the 'text' field.
 * Updates the records by generating a 'text' field from the 'headline'.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export const mismatch = async (): Promise<void> => {
  notify({
    message: `Please wait`,
    timeout: 0,
    actions: [{ icon: 'close' }],
    group: 'mismatch',
  })
  const bucketNames: string[] = []
  const storageNames: string[] = []
  const uploadedFilenames: string[] = app.uploaded.length
    ? app.uploaded.map((it) => it.filename)
    : []
  const refs = await listAll(storageRef(storage, ''))
  for (const r of refs.items) {
    bucketNames.push(r.name)
  }
  const q = query(photosCol)
  const snapshot = await getDocs(q)
  snapshot.forEach((doc) => {
    storageNames.push(doc.id)
  })

  bucketNames.sort()
  storageNames.sort()

  let missing: string[]
  const promises: Promise<{
    url: string
    filename: string
    size: number
    email: string
    nick: string
  }>[] = []
  if (bucketNames.length >= storageNames.length) {
    // uploaded to bucket but no record in firestore
    missing = bucketNames.filter((x) => storageNames.indexOf(x) === -1)
    for (const name of missing) {
      if (uploadedFilenames.indexOf(name) === -1) {
        promises.push(getStorageData(name))
      }
    }
    if (promises.length > 0) {
      Promise.all(promises).then((results) => {
        results.forEach((it) => {
          app.uploaded.push(it)
        })
      })
      notify({
        type: 'negative',
        message: `${promises.length} files uploaded to bucket, but doesn't have record in firestore.<br>
        Resolve mismathed files either by publish or delete.`,
        actions: [
          {
            label: 'Resolve',
            handler: () => {
              router.push({ path: '/add' })
            },
          },
        ],
        multiLine: true,
        html: true,
        timeout: 0,
        group: 'mismatch',
      })
    } else {
      notify({ message: `All good. Nothing to reslove`, group: 'mismatch' })
    }
  } else {
    // records with no image reference
    missing = storageNames.filter((x) => bucketNames.indexOf(x) === -1)
    for (const name of missing) {
      const docRef = doc(db, 'Photo', name)
      await deleteDoc(docRef)
    }
    notify({
      message: `${missing.length} records deleted from firestore that doesn't have image reference`,
      type: 'negative',
      group: 'mismatch',
    })
  }
}
