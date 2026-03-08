<template>
  <v-dialog v-model="dialog" max-width="620" :persistent="isPending">
    <v-card rounded="xl">
      <!-- Title -->
      <v-card-item class="pa-6 pb-2">
        <v-card-title>Buat Pesanan</v-card-title>
        <v-card-subtitle v-if="lens">
          {{ lens.modelName }} &middot; {{ lens.manufacturerName }} &middot;
          Rp {{ Number(lens.dayPrice).toLocaleString('id-ID') }} / hari
        </v-card-subtitle>
      </v-card-item>

      <v-card-text class="pa-6 pt-2">
        <!-- Per-branch stock table -->
        <div class="text-subtitle-2 mb-2">Ketersediaan Stok per Cabang</div>

        <div v-if="inventoryLoading" class="mb-4">
          <v-skeleton-loader type="table-row@3" />
        </div>

        <v-table v-else-if="inventory?.length" density="compact" class="mb-4 rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th class="text-left">Cabang</th>
              <th class="text-center">Tersedia</th>
              <th class="text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in inventory" :key="item.branchCode">
              <td>
                <div class="font-weight-medium">{{ item.branchName }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.branchAddress }}</div>
              </td>
              <td class="text-center">
                <v-chip
                  :color="item.availableQuantity > 0 ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.availableQuantity }}
                </v-chip>
              </td>
              <td class="text-center text-medium-emphasis">{{ item.totalQuantity }}</td>
            </tr>
          </tbody>
        </v-table>

        <!-- No stock anywhere warning -->
        <v-alert
          v-if="!inventoryLoading && noStockAnywhere"
          type="warning"
          variant="tonal"
          title="Stok Habis"
          text="Tidak ada cabang yang memiliki stok untuk lensa ini saat ini. Pesanan tidak dapat dilakukan."
          class="mb-4"
        />

        <v-divider class="mb-4" />

        <!-- Order form -->
        <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
          <v-text-field
            v-model="fields.customerName"
            label="Nama Lengkap"
            prepend-inner-icon="mdi-account"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-2"
          />
          <v-text-field
            v-model="fields.customerEmail"
            label="Email"
            type="email"
            prepend-inner-icon="mdi-email"
            :rules="[rules.required, rules.email]"
            variant="outlined"
            density="comfortable"
            class="mb-2"
          />

          <!-- Branch select with stock badge per option -->
          <v-select
            v-model="fields.branchCode"
            :items="branchSelectItems"
            item-title="title"
            item-value="value"
            :item-props="(item: any) => ({ disabled: item.available === 0 })"
            label="Pilih Cabang"
            prepend-inner-icon="mdi-store"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-2"
            no-data-text="Memuat data cabang..."
          >
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps">
                <template #append>
                  <v-chip
                    :color="item.available > 0 ? 'success' : 'error'"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ item.available }} unit
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Date range -->
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="fields.startDate"
                label="Tanggal Mulai"
                type="date"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="fields.endDate"
                label="Tanggal Selesai"
                type="date"
                :rules="[rules.required, rules.afterStart]"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-form>

        <!-- API error feedback -->
        <v-alert
          v-if="submitError"
          type="error"
          variant="tonal"
          class="mt-2"
          :text="submitError"
          closable
          @click:close="submitError = null"
        />
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" :disabled="isPending" @click="close">Batal</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isPending"
          :disabled="noStockAnywhere || !fields.branchCode"
          @click="submit"
        >
          Konfirmasi Pesanan
        </v-btn>
      </v-card-actions>
    </v-card>
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
