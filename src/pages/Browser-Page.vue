<template>
  <Edit-Record v-if="app.showEdit" :rec="app.currentEdit" @edit-ok="editOk" />
  <Confirm-Delete v-if="app.showConfirm" :rec="select2delete" @confirm-ok="confirmOk" />

  <Transition>
    <KeepAlive>
      <component
        :is="currentView"
        :objects="app.objects"
        @carousel-show="useCarouselShow"
        @carousel-cancel="useCarouselCancel"
        @edit-record="editRecord"
        @confirm-delete="confirmShow"
        @edit-ok="editOk"
      ></component>
    </KeepAlive>
  </Transition>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, defineAsyncComponent, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useRoute } from 'vue-router'
import { fakeHistory } from '../helpers'
import { useCarouselShow, useCarouselCancel } from '../helpers/common'
import type { StoredItem } from '../components/models'

import SwiperView from '../components/Swiper-View.vue'
import ListView from '../components/List-View.vue'

const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))
const ConfirmDelete = defineAsyncComponent(() => import('../components/Confirm-Delete.vue'))

const app = useAppStore()
const route = useRoute()
const select2delete = ref({})

const { showCarousel } = storeToRefs(app)
const currentView = shallowRef(ListView)

onMounted(() => {
  const hash = route.hash
  if (hash) {
    const filename = hash.substring(2)
    currentView.value = SwiperView
    app.markerFileName = filename
    showCarousel.value = true // Ensure the carousel is shown
  }
})
watchEffect(() => {
  if (showCarousel.value === true) {
    currentView.value = SwiperView
  } else {
    currentView.value = ListView
  }
})

const confirmShow = (rec: StoredItem) => {
  select2delete.value = rec
  fakeHistory()
  app.showConfirm = true
}
const confirmOk = (rec: StoredItem) => {
  app.showConfirm = false
  app.deleteRecord(rec)
}

const editRecord = (rec: StoredItem) => {
  app.currentEdit = rec
  fakeHistory()
  app.showEdit = true
}
const editOk = (hash: string) => {
  const el = document.querySelector('#' + hash)
  if (!el) return
  el.classList.add('bounce')
  setTimeout(() => {
    el.classList.remove('bounce')
  }, 2000)
}
</script>
