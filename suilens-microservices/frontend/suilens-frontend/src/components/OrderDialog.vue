<template>
  <v-dialog v-model="dialog" max-width="640" :persistent="isPending">
    <!-- MD3 dialog: 28px radius, surface-container background -->
    <div class="dialog-shell overflow-hidden" style="background: #FFFBFE; border-radius: 28px;">

      <!-- ── Header with gradient accent ──────────────────────────────── -->
      <div class="px-7 pt-7 pb-4" style="background: #F3EDF7;">
        <!-- Corner accent blob -->
        <div
          aria-hidden="true"
          class="absolute top-0 right-0 h-32 w-32 rounded-full opacity-30 blur-3xl pointer-events-none"
          style="background: #6750A4;"
        />
        <div class="flex items-start gap-4 relative">
          <div
            class="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center"
            style="background: #6750A4;"
          >
            <v-icon color="white" size="22">mdi-camera-iris</v-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-semibold" style="color: #1C1B1F;">Buat Pesanan</h2>
            <p v-if="lens" class="text-sm mt-0.5 truncate" style="color: #49454F;">
              {{ lens.modelName }} &middot; {{ lens.manufacturerName }}
              &middot;
              <span style="color: #6750A4; font-weight: 600;">
                Rp {{ Number(lens.dayPrice).toLocaleString('id-ID') }}
              </span>
              / hari
            </p>
          </div>
          <button
            class="flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-colors duration-200 active:scale-95"
            style="color: #49454F;"
            :disabled="isPending"
            @click="close"
          >
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
      </div>

      <!-- ── Scrollable body ────────────────────────────────────────────── -->
      <div class="px-7 py-5 overflow-y-auto" style="max-height: 70vh;">

        <!-- Stock table -->
        <p class="text-xs font-semibold tracking-widest uppercase mb-3" style="color: #79747E;">Ketersediaan Stok per Cabang</p>

        <div v-if="inventoryLoading" class="mb-5">
          <v-skeleton-loader type="table-row@3" :style="{ borderRadius: '16px' }" />
        </div>

        <div v-else-if="inventory?.length" class="rounded-2xl overflow-hidden mb-5" style="background: #F3EDF7;">
          <table class="w-full text-sm">
            <thead>
              <tr style="border-bottom: 1px solid #E7E0EC;">
                <th class="text-left px-4 py-2.5 font-medium" style="color: #49454F;">Cabang</th>
                <th class="text-center px-4 py-2.5 font-medium" style="color: #49454F;">Tersedia</th>
                <th class="text-center px-4 py-2.5 font-medium" style="color: #49454F;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in inventory"
                :key="item.branchCode"
                style="border-bottom: 1px solid #E7E0EC;"
                class="last:border-0"
              >
                <td class="px-4 py-3">
                  <div class="font-medium" style="color: #1C1B1F;">{{ item.branchName }}</div>
                  <div class="text-xs" style="color: #79747E;">{{ item.branchAddress }}</div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    :style="item.availableQuantity > 0
                      ? 'background:#DCFCE7; color:#166534;'
                      : 'background:#FEE2E2; color:#991B1B;'"
                  >
                    {{ item.availableQuantity }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center text-xs" style="color: #79747E;">{{ item.totalQuantity }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- No stock warning -->
        <div
          v-if="!inventoryLoading && noStockAnywhere"
          class="flex items-start gap-3 rounded-2xl px-4 py-3 mb-5"
          style="background: #FFF3CD; color: #664D03;"
        >
          <v-icon size="20" style="color: #664D03; flex-shrink:0; margin-top:2px;">mdi-alert-outline</v-icon>
          <div>
            <p class="font-semibold text-sm">Stok Habis</p>
            <p class="text-xs mt-0.5">Tidak ada cabang yang memiliki stok untuk lensa ini. Pesanan tidak dapat dilakukan.</p>
          </div>
        </div>

        <!-- Divider -->
        <div class="my-5" style="height:1px; background:#E7E0EC;" />

        <!-- Order form -->
        <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
          <!-- MD3 filled text field: rounded-t, border-bottom -->
          <div class="field-group mb-5">
            <v-text-field
              v-model="fields.customerName"
              label="Nama Lengkap"
              prepend-inner-icon="mdi-account"
              :rules="[rules.required]"
              variant="filled"
              class="md3-field"
            />
          </div>
          <div class="field-group mb-5">
            <v-text-field
              v-model="fields.customerEmail"
              label="Email"
              type="email"
              prepend-inner-icon="mdi-email"
              :rules="[rules.required, rules.email]"
              variant="filled"
              class="md3-field"
            />
          </div>

          <!-- Branch select with stock badge per option -->
          <div class="field-group mb-5">
            <v-select
              v-model="fields.branchCode"
              :items="branchSelectItems"
              item-title="title"
              item-value="value"
              :item-props="(item: any) => ({ disabled: item.available === 0 })"
              label="Pilih Cabang"
              prepend-inner-icon="mdi-store"
              :rules="[rules.required]"
              variant="filled"
              class="md3-field"
              no-data-text="Memuat data cabang..."
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template #append>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ml-2"
                      :style="(item as any).available > 0
                        ? 'background:#DCFCE7; color:#166534;'
                        : 'background:#FEE2E2; color:#991B1B;'"
                    >
                      {{ (item as any).available }} unit
                    </span>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </div>

          <!-- Date range -->
          <div class="grid grid-cols-2 gap-4">
            <div class="field-group">
              <v-text-field
                v-model="fields.startDate"
                label="Tanggal Mulai"
                type="date"
                persistent-placeholder
                prepend-inner-icon="mdi-calendar"
                :rules="[rules.required]"
                variant="filled"
                class="md3-field hide-calendar-indicator"
              />
            </div>
            <div class="field-group">
              <v-text-field
                v-model="fields.endDate"
                label="Tanggal Selesai"
                type="date"
                persistent-placeholder
                prepend-inner-icon="mdi-calendar"
                :rules="[rules.required, rules.afterStart]"
                variant="filled"
                class="md3-field hide-calendar-indicator"
              />startDate
            </div>
          </div>

          <!-- Price summary — appears once both dates are valid -->
          <Transition name="fade-up">
            <div
              v-if="rentalDays > 0"
              class="mt-5 rounded-2xl px-5 py-4"
              style="background: #E8DEF8;"
            >
              <p class="text-xs font-semibold tracking-widest uppercase mb-3" style="color: #49454F;">Estimasi Total Harga</p>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-2xl font-bold" style="color: #6750A4;">
                    Rp {{ totalPrice.toLocaleString('id-ID') }}
                  </p>
                  <p class="text-xs mt-1" style="color: #79747E;">
                    Rp {{ Number(lens?.dayPrice).toLocaleString('id-ID') }} &times; {{ rentalDays }} hari
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </v-form>

        <!-- API error -->
        <div
          v-if="submitError"
          class="flex items-start gap-3 rounded-2xl px-4 py-3 mt-4"
          style="background: #FEE2E2; color: #991B1B;"
        >
          <v-icon size="18" style="color:#991B1B; flex-shrink:0; margin-top:2px;">mdi-alert-circle-outline</v-icon>
          <div class="flex-1 text-sm">{{ submitError }}</div>
          <button class="flex-shrink-0 active:scale-95" @click="submitError = null">
            <v-icon size="16" style="color:#991B1B;">mdi-close</v-icon>
          </button>
        </div>

      </div>

      <!-- ── Footer actions ─────────────────────────────────────────────── -->
      <div class="flex items-center justify-end gap-3 px-7 py-5" style="background: #F3EDF7;">
        <!-- Text button -->
        <button
          class="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
          style="color: #6750A4;"
          :disabled="isPending"
          @click="close"
        >
          Batal
        </button>

        <!-- Filled primary button -->
        <button
          class="
            inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white
            transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
            shadow-none hover:shadow-md active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
          "
          style="background: #6750A4;"
          :disabled="noStockAnywhere || !fields.branchCode || isPending"
          @click="submit"
        >
          <v-progress-circular v-if="isPending" indeterminate size="16" width="2" color="white" />
          <v-icon v-else size="18">mdi-check-circle-outline</v-icon>
          Konfirmasi Pesanan
        </button>
      </div>

    </div>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useInventoryByLens } from '@/composables/UseInventory';
import { useCreateOrder } from '@/composables/UseOrders';
import type { Lens } from '@/composables/UseLenses';

// ── Props / emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  modelValue: boolean;
  lens: Lens | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'ordered'): void;
}>();

// ── Dialog v-model ────────────────────────────────────────────────────────────
const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// ── Inventory data ────────────────────────────────────────────────────────────
const { data: inventory, isLoading: inventoryLoading } = useInventoryByLens(
  computed(() => props.lens?.id ?? null),
);

const noStockAnywhere = computed(
  () =>
    !inventoryLoading.value &&
    (inventory.value?.every((i) => i.availableQuantity === 0) ?? true),
);

const branchSelectItems = computed(() =>
  (inventory.value ?? []).map((i) => ({
    title: i.branchName,
    value: i.branchCode,
    available: i.availableQuantity,
  })),
);

// ── Form ──────────────────────────────────────────────────────────────────────
const formRef = ref();
const formValid = ref(false);
const submitError = ref<string | null>(null);

const fields = ref({
  customerName: '',
  customerEmail: '',
  branchCode: '',
  startDate: '',
  endDate: '',
});

const rules = {
  required: (v: string) => !!v || 'Field wajib diisi',
  email: (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email tidak valid',
  afterStart: (v: string) => {
    if (!fields.value.startDate || !v) return true;
    return (
      new Date(v) > new Date(fields.value.startDate) ||
      'Tanggal selesai harus setelah tanggal mulai'
    );
  },
};

// Reset form when dialog closes
watch(dialog, (open) => {
  if (!open) {
    fields.value = {
      customerName: '',
      customerEmail: '',
      branchCode: '',
      startDate: '',
      endDate: '',
    };
    submitError.value = null;
    formRef.value?.reset();
  }
});

// ── Price calculation ─────────────────────────────────────────────────────────
const rentalDays = computed(() => {
  if (!fields.value.startDate || !fields.value.endDate) return 0;
  const start = new Date(fields.value.startDate);
  const end = new Date(fields.value.endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
});

const totalPrice = computed(() => {
  if (!rentalDays.value || !props.lens) return 0;
  return rentalDays.value * Number(props.lens.dayPrice);
});

// ── Submit ────────────────────────────────────────────────────────────────────
const queryClient = useQueryClient();
const { mutateAsync, isPending } = useCreateOrder();

async function submit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  submitError.value = null;

  try {
    await mutateAsync({
      customerName: fields.value.customerName,
      customerEmail: fields.value.customerEmail,
      lensId: props.lens!.id,
      branchCode: fields.value.branchCode,
      startDate: fields.value.startDate,
      endDate: fields.value.endDate,
    });
    // Invalidate inventory cache so stock badges refresh immediately
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    emit('ordered');
  } catch (err) {
    submitError.value =
      err instanceof Error ? err.message : 'Terjadi kesalahan, coba lagi.';
  }
}

function close() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
/* 1. MD3 text field look: Semua sudut membulat 12px */
.md3-field :deep(.v-field) {
  background: #E7E0EC !important;
  border-radius: 12px !important;
}

/* 2. Jarak (gap) ekstra antara ikon dan teks/label */
.md3-field :deep(.v-field__prepend-inner) {
  margin-right: 12px !important;
}

/* Memberikan jarak (gap) antara label yang mengambang dengan area input/teks */
.md3-field :deep(.v-field__input) {
  padding-top: 26px !important; /* Mendorong teks ke bawah agar menjauhi label */
  padding-bottom: 8px !important;
  min-height: 56px !important;
  align-items: flex-end !important;
}

/* Khusus untuk input tanggal agar format mm/dd/yyyy bawaan browser tidak menabrak label */
.md3-field :deep(input[type="date"]) {
  margin-top: 4px !important;
}

/* 3. Menghilangkan garis bawah (underline) bawaan form filled */
.md3-field :deep(.v-field__outline::before),
.md3-field :deep(.v-field__outline::after) {
  border-bottom-color: transparent !important;
  border-bottom-width: 0 !important;
}

/* 4. Warna saat kolom sedang diklik (fokus) */
.md3-field :deep(.v-field--focused) {
  background: #D3CCE0 !important;
}


/* Menghilangkan ikon kalender bawaan browser secara total dan absolut */
.hide-calendar-indicator :deep(input[type="date"]::-webkit-calendar-picker-indicator) {
  display: none !important;
}

/* Memastikan input relative agar ::-webkit-calendar-picker-indicator membentang sempurna */
.hide-calendar-indicator :deep(input[type="date"]) {
  position: relative;
}

/* 6. Sembunyikan native input khusus v-select agar tidak bertumpuk (Tailwind fix) */
.v-select.md3-field :deep(input) {
  color: transparent !important;
  caret-color: transparent !important;
}

/* Bayangan dialog shell */
.dialog-shell {
  position: relative;
  box-shadow: 0 8px 32px rgba(103, 80, 164, 0.18);
}

/* Price summary slide-up animation (Fitur Barumu) */
.fade-up-enter-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.2, 0, 0, 1);
}
.fade-up-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>