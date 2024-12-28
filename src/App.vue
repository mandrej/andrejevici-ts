<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from './stores/app'
import { useValuesStore } from './stores/values'

const app = useAppStore()
const meta = useValuesStore()

onMounted(() => {
  app.getLast()
  app.bucketRead()
  meta.countersBuild(['year', 'tags', 'model', 'lens', 'email'])
})
</script>
