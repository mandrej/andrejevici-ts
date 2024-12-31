<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from './stores/app'
import { useUserStore } from './stores/user'
import { useValuesStore } from './stores/values'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()

onMounted(() => {
  app.getLast()
  app.bucketBuild()
  meta.countersBuild(['year', 'tags', 'model', 'lens', 'email'])
})

onAuthStateChanged(getAuth(), (user) => {
  // onAuthStateChanged was always triggered after 1 hour and the user was disconnected.
  if (user) {
    auth.storeUser(user as User)
  } else {
    auth.user = null
  }
})
</script>
