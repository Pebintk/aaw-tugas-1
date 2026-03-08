<template>
  <v-container class="py-8" max-width="1280">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold font-heading">Katalog Lensa</h1>
      <p class="text-medium-emphasis mt-1">Pilih lensa dan cabang untuk memulai pemesanan.</p>
    </div>

    <!-- Loading -->
    <v-row v-if="lensesLoading">
      <v-col v-for="n in 6" :key="n" cols="12" sm="6" lg="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <!-- Error -->
    <v-alert
      v-else-if="lensesError"
      type="error"
      title="Gagal memuat katalog"
      :text="lensesError.message"
      class="mb-4"
    />

    <!-- Lens Grid -->
    <v-row v-else>
      <v-col v-for="lens in lenses" :key="lens.id" cols="12" sm="6" lg="4">
        <v-card class="d-flex flex-column h-full" rounded="xl" variant="flat">
          <v-card-item>
            <v-card-title class="text-wrap">{{ lens.modelName }}</v-card-title>
            <v-card-subtitle>{{ lens.manufacturerName }}</v-card-subtitle>
          </v-card-item>

          <v-card-text class="flex-grow-1">
            <!-- Spec chips -->
            <div class="d-flex flex-wrap gap-2 mb-3">
              <v-chip prepend-icon="mdi-camera-iris" size="small" variant="tonal">
                {{ lens.minFocalLength }}–{{ lens.maxFocalLength }}mm
              </v-chip>
              <v-chip prepend-icon="mdi-aperture" size="small" variant="tonal">
                f/{{ lens.maxAperture }}
              </v-chip>
              <v-chip prepend-icon="mdi-camera-outline" size="small" variant="tonal">
                {{ lens.mountType }}
              </v-chip>
            </div>

            <!-- Price -->
            <div class="text-h6 font-weight-bold mb-3">
              Rp {{ Number(lens.dayPrice).toLocaleString('id-ID') }}
              <span class="text-body-2 font-weight-regular text-medium-emphasis">/ hari</span>
            </div>

            <!-- Per-branch stock -->
            <div class="text-caption text-medium-emphasis font-weight-medium mb-1">
              Ketersediaan per Cabang
            </div>
            <LensStockSummary :lens-id="lens.id" />
          </v-card-text>

          <v-card-actions class="pa-4 pt-0">
            <v-spacer />
            <v-btn
              color="primary"
              variant="elevated"
              rounded="lg"
              prepend-icon="mdi-cart-plus"
              @click="openDialog(lens)"
            >
              Pesan
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Order Dialog -->
    <OrderDialog
      v-model="dialogOpen"
      :lens="selectedLens"
      @ordered="onOrdered"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="snackbar" color="success" :timeout="4000">
      <v-icon start>mdi-check-circle</v-icon>
      Pesanan berhasil dibuat!
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useLenses, type Lens } from '@/composables/UseLenses';
import LensStockSummary from '@/components/LensStockSummary.vue';
import OrderDialog from '@/components/OrderDialog.vue';

const { data: lenses, isLoading: lensesLoading, error: lensesError } = useLenses();

const dialogOpen = ref(false);
const selectedLens = ref<Lens | null>(null);
const snackbar = ref(false);

function openDialog(lens: Lens) {
  selectedLens.value = lens;
  dialogOpen.value = true;
}

function onOrdered() {
  dialogOpen.value = false;
  snackbar.value = true;
}
</script>
