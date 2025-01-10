<template>
  <Edit-Record v-if="app.showEdit" :rec="app.currentEdit" />

  <q-page v-else class="q-pa-md">
    <div class="relative-position column q-pb-md">
      <div class="row absolute-top">
        <q-linear-progress
          v-for="(value, name) in progressInfo"
          :key="name"
          size="15px"
          :value="value"
          color="warning"
          :style="{ width: 100 / Object.keys(progressInfo).length + '%' }"
        />
      </div>
    </div>

    <q-form @submit="onSubmit" class="q-gutter-md">
      <q-file
        name="photos"
        v-model="files"
        use-chips
        multiple
        :accept="CONFIG.fileType"
        :max-file-size="CONFIG.fileSize"
        :max-files="CONFIG.fileMax"
        label="Select images to upload"
        hint="Drag your images above to upload, or click to browse and select. Then
          publish image on site. Accepts maximum 10 jpg (jpeg) files less then 4
          Mb in size."
        @rejected="onValidationError"
      />
      <div class="row justify-end">
        <q-btn
          label="Cancel all"
          type="button"
          color="negative"
          class="col-lg-4 col-sm-5 col-xs-6"
          @click="cancelAll"
          v-morph:cancel:buttons:500="morphModel"
        />
        <q-btn
          label="Upload"
          type="submit"
          icon="file_upload"
          color="primary"
          class="col-lg-2 col-sm-3 col-xs-4"
          v-morph:upload:buttons:500="morphModel"
          :disable="files.length === 0"
        />
      </div>
    </q-form>

    <q-select
      v-model="tagsToApply"
      :options="meta.tagsValues"
      new-value-mode="add-unique"
      hide-dropdown-icon
      multiple
      label="Tags to apply for next publish / or to merge with existing"
      hint="You can add / remove tag later"
      @new-value="addNewTag"
    />

    <div class="q-mt-md">
      <transition-group tag="div" class="row q-col-gutter-md" name="fade">
        <div
          v-for="rec in uploaded"
          :key="rec.filename"
          class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
        >
          <Picture-Card
            :rec="rec"
            :canManage="true"
            @delete-record="app.deleteRecord"
            @edit-record="editRecord"
          />
        </div>
      </transition-group>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import uuid4 from 'uuid4'
import { defineAsyncComponent, computed, reactive, ref } from 'vue'
import { storage } from '../boot/fire'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { CONFIG, fakeHistory, emailNick, reFilename } from '../helpers'
import notify from '../helpers/notify'
import readExif from '../helpers/exif'
import PictureCard from '../components/Picture-Card.vue'
import type { StoredItem } from 'src/components/models'
import type { UploadTaskSnapshot } from 'firebase/storage'

const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const tagsToApply = computed({
  get() {
    return meta.tagsToApply
  },
  set(newValue) {
    meta.tagsToApply = newValue
  },
})
const uploaded = computed(() => app.uploaded as StoredItem[])

interface Info {
  [key: string]: number
}
interface Task {
  [key: string]: ReturnType<typeof uploadBytesResumable>
}

const files = ref([])
const progressInfo: Info = reactive({})
const task: Task = {}
const morphModel = ref('upload')

/**
 * Alters the given filename by appending a unique identifier.
 *
 * @param {string} filename - The original filename.
 * @returns {string} The altered filename with a unique identifier.
 */
const alter = (filename: string): string => {
  const id: string = uuid4()
  const [, name, ext] = filename.match(reFilename) as RegExpMatchArray
  return name + '_' + id.substring(id.length - 12) + ext
}

/**
 * Checks if a file with the given filename exists in the storage and returns the
 * filename if it does not exist, or a modified filename if it does.
 *
 * @param {string} originalFilename - The original filename.
 * @returns {Promise<string>} The modified filename.
 */
const checkExists = async (originalFilename: string): Promise<string> => {
  const reClean = new RegExp(/[.\s\\){}[\]]+/g)
  const [, name, ext] = originalFilename.match(reFilename) as RegExpMatchArray
  let filename = name!.replace(/[(]+/g, '_').replace(reClean, '') + ext

  try {
    await getDownloadURL(storageRef(storage, filename))
    // exist rename
    filename = alter(filename)
  } catch (error) {
    if ((error as { code: string }).code === 'storage/object-not-found') {
      // does not exist
    } else {
      notify({
        type: 'external',
        html: true,
        message: `${originalFilename}<br/>${error}`,
        actions: [{ icon: 'close' }],
        timeout: 0,
      })
      throw error
    }
  }

  return filename
}

/**
 * Cancels all currently running file upload tasks.
 *
 * @returns {void}
 */
const cancelAll = (): void => {
  Object.keys(progressInfo).forEach((key: string) => {
    if (task[key]) {
      task[key].cancel()
    }
  })
  morphModel.value = 'upload'
}
/**
 * Handles the form submission, uploading all selected files to Firebase storage.
 *
 * @param {SubmitEvent} evt - The form submission event.
 */
const onSubmit = async (evt: Event): Promise<void> => {
  const promises: Promise<unknown>[] = []
  const formData = new FormData(evt.target as HTMLFormElement)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [name, file] of formData.entries()) {
    // name = 'photos'
    if (file instanceof File) {
      promises.push(uploadTask(file))
    }
  }

  morphModel.value = 'cancel'
  files.value = []
  const results = await Promise.allSettled(promises)
  results.forEach((it) => {
    if (it.status === 'rejected') {
      notify({
        type: 'negative',
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: 'close' }],
        timeout: 0,
      })
      delete task[it.reason]
      delete progressInfo[it.reason]
    } else if (it.status === 'fulfilled') {
      notify({
        type: 'positive',
        message: `Uploaded ${it.value}.`,
      })
      delete task[it.value as string]
      delete progressInfo[it.value as string]
    }
  })
  morphModel.value = 'upload'
}

/**
 * A function that takes a file and uploads it to the storage.
 * Returns a promise that resolves to the filename of the uploaded file.
 *
 * @param {File} file - The file to be uploaded.
 * @returns {Promise<string>} A promise that resolves to the filename of the uploaded file.
 */
const uploadTask = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    checkExists(file.name)
      .then((filename) => {
        progressInfo[file.name] = 0
        const _ref = storageRef(storage, filename)
        task[file.name] = uploadBytesResumable(_ref, file, {
          contentType: file.type,
          cacheControl: 'public, max-age=604800',
        })
        task[file.name]?.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            progressInfo[file.name] = snapshot.bytesTransferred / snapshot.totalBytes
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          (error: Error) => {
            progressInfo[file.name] = 0
            reject(file.name)
          },
          () => {
            getDownloadURL(task[file.name]!.snapshot.ref).then((downloadURL) => {
              const data = {
                url: downloadURL,
                filename: filename,
                size: file.size,
                email: auth.user!.email,
                nick: emailNick(auth.user!.email),
                headline: '', // Add default value for headline
                thumb: '', // Add default value for thumb
                model: '', // Add default value for model
              }
              app.uploaded.push(data)
              resolve(file.name)
              if (process.env.DEV) console.log('uploaded', file.name)
            })
          },
        )
      })
      .catch((error: Error) => {
        reject(error)
      })
  })
}

/**
 * Called when the uploader encounters a validation error.
 *
 * @param {ValidationErrors[]} rejectedEntries - An array of objects describing the validation errors.
 * @returns {void}
 */
const onValidationError = (rejectedEntries: ValidationErrors[]): void => {
  rejectedEntries.forEach(({ file, failedPropValidation }) => {
    notify({
      type: 'warning',
      message: `${file.name}: ${failedPropValidation} validation error`,
      actions: [{ icon: 'close' }],
      timeout: 0,
    })
  })
}

/**
 * Describes a validation error.
 */
interface ValidationErrors {
  file: File
  failedPropValidation: string
}

/**
 * Add a new tag to the meta fields.
 * @param {string} inputValue - The tag value to be added.
 * @param {(result: string) => void} done - Callback function to be called with the input value.
 * @returns {void}
 */
const addNewTag = (inputValue: string, done: (result: string) => void): void => {
  meta.addNewField(inputValue, 'tags')
  done(inputValue)
}
const editRecord = async (rec: StoredItem) => {
  // /**
  //  * PUBLISH RECORD
  //  * Add user email and tags: [] to new rec; read exif
  //  * See Edit-Record getExif
  //  */
  const exif = await readExif(rec.url)
  const tags = [...(tagsToApply.value || '')]
  rec = { ...rec, ...exif }
  // add flash tag if exif flash true
  if (rec.flash && tags.indexOf('flash') === -1) {
    tags.push('flash')
  }
  rec.tags = tags
  rec.email = auth.user!.email

  fakeHistory()
  app.showEdit = true
  app.currentEdit = rec
  app.showEdit = true
}
</script>
