<template>
  <q-page>
    <q-banner
      v-if="app.error && app.error === 'empty'"
      class="fixed-center text-center bg-warning q-pa-md"
      style="z-index: 100"
      rounded
    >
      <q-icon name="error_outline" size="4em" />
      <div class="text-h6">No data found</div>
      <div>for current filter/ search</div>
    </q-banner>
    <q-banner
      v-else-if="app.error && app.error !== 'empty'"
      class="fixed-center text-center bg-warning q-pa-md"
      style="z-index: 100"
      rounded
    >
      <q-icon name="error_outline" size="4em" />
      <div class="text-h6">Something went wrong ...</div>
      <div>{{ app.error }}</div>
    </q-banner>

    <q-scroll-observer @scroll="scrollHandler" axis="vertical" :debounce="500" />

    <div class="q-pa-md">
      <div v-for="(list, index) in groupObjects" :key="index" class="q-mb-md">
        <transition-group tag="div" class="row q-col-gutter-md" name="fade">
          <div
            v-for="item in list"
            :key="item.filename"
            class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
          >
            <Picture-Card
              :rec="item"
              :canManage="isAuthorOrAdmin(item)"
              :canMergeTags="tagsToApplyExist()"
              @carousel-show="emit('carouselShow', item.filename)"
              @edit-record="emit('editRecord', item)"
              @merge-tags="mergeTags(item)"
              @confirm-delete="emit('confirmDelete', item)"
              @delete-record="app.deleteRecord"
            />
          </div>
        </transition-group>
      </div>
    </div>

    <q-page-scroller position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
      <q-btn fab icon="arrow_upward" color="warning" />
    </q-page-scroller>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { throttle } from 'quasar'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import { CONFIG, U } from '../helpers'
import type { StoredItem } from './models'

import PictureCard from '../components/Picture-Card.vue'

const props = defineProps<{ objects: StoredItem[] }>()
const emit = defineEmits([
  'carouselShow',
  'carouselCancel',
  'editRecord',
  'editOk',
  'confirmDelete',
])

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()

const groupObjects = computed(() => {
  const groups = []
  for (let i = 0; i < props.objects.length; i += CONFIG.group) {
    groups.push(props.objects.slice(i, i + CONFIG.group))
  }
  return groups
})

const scrollHandler = throttle((obj) => {
  // trottle until busy: true
  const scrollHeight = document.documentElement.scrollHeight
  if (scrollHeight - obj.position.top < 2000 && app.next) {
    app.fetchRecords(false, 'scroll')
  }
}, 200)

const isAuthorOrAdmin = (rec: StoredItem) => {
  if (!auth.user) return false
  return (auth.user.isAdmin || auth.user.email === rec.email) && app.editMode
}

const tagsToApplyExist = (): boolean => {
  return Boolean(Array.isArray(meta.tagsToApply) && auth.user && auth.user.isAdmin)
}

const mergeTags = (rec: StoredItem) => {
  rec.tags = Array.from(new Set([...meta.tagsToApply, ...(rec.tags as string[])])).sort()
  app.saveRecord(rec)
  emit('editOk', U + rec.filename)
}
</script>
