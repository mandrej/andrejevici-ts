import { defineStore, acceptHMRUpdate } from 'pinia'
import { nextTick } from 'vue'
import { CONFIG } from '../helpers'
import { auth, db } from '../boot/fire'
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
// import router from '../router'
import type { User, UserCredential, AuthError } from 'firebase/auth'
import type { userType } from '../components/models'
import type { Firestore, Query } from '@firebase/firestore'
// import type { Router } from 'vue-router'

const provider = new GoogleAuthProvider()
// provider.addScope("https://www.googleapis.com/auth/userinfo.profile");
const deviceCol = collection(db, 'Device')

// const timeStamp2Date = (ts) => {
//   const timeStamp = ts.seconds * 1000 + ts.nanoseconds / 1e6;
//   return new Date(timeStamp);
// };

/**
 * Checks if an email belongs to a family member.
 * @param email - The email address to check.
 * @returns The email address if it belongs to a family member, otherwise undefined.
 */
const familyMember = (email: string): string | undefined => {
  return CONFIG.family.find((el: string) => el === email)
}
/**
 * Checks if an email belongs to an admin member.
 * @param {string} email - The email address to check.
 * @returns {string | undefined} The email address if it belongs to an admin member, otherwise undefined.
 */
const adminMember = (email: string): string | undefined => {
  return CONFIG.admins.find((el: string) => el === email)
}

export const useUserStore = defineStore('auth', {
  state(): {
    user: userType | null
    token: string | null
  } {
    return {
      user: null,
      token: null,
    }
  },
  getters: {
    /**
     * Checks if we should show the consent dialog.
     *
     * @param {import("pinia").StateTree} state - The state object.
     * @returns {boolean} true if the consent dialog should be shown, false otherwise.
     */
    showConsent(state: { user: userType | null; token: string | null }): boolean {
      return Boolean(
        'Notification' in window && state.user && state.user.allowPush && state.user.askPush,
      )
    },
  },
  actions: {
    /**
     * Stores a user in the database and updates local user state.
     * @param {User} user - The user object from Firebase authentication.
     * @returns {Promise<void>} A promise that resolves when the user data is stored.
     */
    async storeUser(user: User): Promise<void> {
      this.user = {
        name: user.displayName || '',
        email: user.email || '',
        uid: user.uid,
        isAuthorized: Boolean(familyMember(user.email || '')), // only family members
        isAdmin: Boolean(adminMember(user.email || '')),
        signedIn: new Date(),
      }

      const docRef = doc(db, 'User', user.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as userType
        this.user.allowPush = data.allowPush ?? true
      } else {
        this.user.allowPush = true
      }

      this.user.askPush = this.token ? false : true
      await setDoc(docRef, this.user, { merge: true })
    },
    /**
     * Signs in the user with the Google provider, or signs out the current user.
     * @param {void} - No arguments.
     * @returns {Promise<void>} A promise that resolves when the sign-in or sign-out is complete.
     */
    signIn(): Promise<void> {
      if (this.user && this.user.uid) {
        return auth.signOut().then(() => {
          this.user = null
          // const currentRouter: Router = router
          // const routeName = currentRouter.currentRoute.value.name
          // if (routeName === 'add' || routeName === 'admin') {
          //   currentRouter.push({ name: 'home' })
          // }
        })
      } else {
        return signInWithPopup(getAuth(), provider)
          .then((result: UserCredential) => {
            if (process.env.DEV) console.log(`Auth user: ${result.user.displayName}`)
          })
          .catch((err: AuthError) => {
            console.error(err.message)
          })
      }
    },
    /**
     * Updates the user document in the database.
     * @returns {Promise<void>} A promise that resolves when the update is complete.
     */
    async updateUser(): Promise<void> {
      const docRef = doc(db, 'User', this.user!.uid)
      await updateDoc(docRef, this.user!)
    },
    /**
     * Updates the device document in the database.
     * @param {string} token - The device token.
     * @param {userType} user - The user object.
     * @returns {Promise<void>} A promise that resolves when the update is complete.
     */
    async updateDevice(token: string, user: userType): Promise<void> {
      const docRef = doc(db, 'Device', token)
      const data: { email: string; stamp: Date } = {
        email: user.email,
        stamp: new Date(),
      }
      await setDoc(docRef, data, { merge: true })
    },
    /**
     * Removes a device associated with the current user's email.
     * @returns {Promise<void>} A promise that resolves when the device deletion is complete.
     */
    removeDevice(): Promise<void> {
      const q = query(deviceCol, where('email', '==', this.user?.email || ''))
      return new Promise<void>((resolve, reject) => {
        this.deleteQueryBatch(db, q, resolve).catch(reject)
      })
    },

    /**
     * Recursively deletes all the documents in a query in batches.
     * @param {Firestore} db - The Firestore database.
     * @param {Query} query - The Firestore query.
     * @param {() => void} resolve - The function to call when the deletion is complete.
     * @returns {Promise<void>} A promise that resolves when the deletion is complete.
     */
    async deleteQueryBatch(db: Firestore, query: Query, resolve: () => void): Promise<void> {
      const querySnapshot = await getDocs(query)
      const batchSize = querySnapshot.size
      if (batchSize === 0) {
        resolve()
        return
      }

      const batch = writeBatch(db)
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      nextTick(() => {
        this.deleteQueryBatch(db, query, resolve)
      })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
