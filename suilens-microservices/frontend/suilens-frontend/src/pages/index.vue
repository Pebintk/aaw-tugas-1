<template>
  <!-- MD3 background surface -->
  <div class="relative min-h-screen overflow-x-hidden" style="background: #FFFBFE;">

    <!-- ── Atmospheric blur shapes ──────────────────────────────────────── -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden -z-0">
      <!-- Primary blob top-right -->
      <div
        class="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
        style="background: #6750A4;"
      />
      <!-- Secondary blob left -->
      <div
        class="absolute top-1/3 -left-48 h-[400px] w-[400px] rounded-full opacity-15 blur-3xl"
        style="background: #E8DEF8;"
      />
      <!-- Tertiary blob bottom-right -->
      <div
        class="absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full opacity-15 blur-3xl"
        style="background: #FFD8E4;"
      />
    </div>

    <v-container fluid class="relative z-10 py-12 px-6 lg:px-12">

      <!-- ── Hero header ──────────────────────────────────────────────────── -->
      <div
        class="mb-10 px-8 py-10 max-w-7xl rounded-[48px]"
        style="background: #F3EDF7;"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center"
              style="background: #6750A4;"
            >
              <v-icon color="white" size="28">mdi-camera-iris</v-icon>
            </div>
            <div>
              <h1 class="text-4xl font-bold tracking-tight" style="color: #1C1B1F; font-family: Roboto, sans-serif;">
                Katalog Lensa
              </h1>
              <p class="mt-1 text-base" style="color: #49454F;">
                Pilih lensa, lihat ketersediaan per cabang, dan mulai pemesanan.
              </p>
            </div>
          </div>
          <router-link
            to="/orders"
            class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 active:scale-95 no-underline"
            style="background: #E8DEF8; color: #6750A4;"
          >
            <v-icon size="18">mdi-clipboard-list-outline</v-icon>
            Lihat Pesanan
          </router-link>
        </div>
      </div>

      <!-- ── Loading ──────────────────────────────────────────────────────── -->
      <v-row v-if="lensesLoading">
        <v-col v-for="n in 6" :key="n" cols="12" sm="6" lg="4">
          <v-skeleton-loader
            type="card"
            :style="{ borderRadius: '24px', background: '#F3EDF7' }"
          />
        </v-col>
      </v-row>

      <!-- ── Error ────────────────────────────────────────────────────────── -->
      <v-alert
        v-else-if="lensesError"
        type="error"
        variant="tonal"
        rounded="xl"
        title="Gagal memuat katalog"
        :text="lensesError.message"
        class="mb-6"
      />

      <!-- ── Lens grid ─────────────────────────────────────────────────────── -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          v-for="lens in lenses"
          :key="lens.id"
          class="group flex flex-col rounded-[24px] transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm hover:shadow-md hover:scale-[1.02] cursor-default"
          style="background: #F3EDF7;"
        >
          <!-- Card header accent strip -->
          <div
            class="h-2 w-full rounded-t-[24px] flex-shrink-0"
            style="background: linear-gradient(90deg, #6750A4 0%, #7D5260 100%);"
          />

          <div class="flex flex-col flex-1 p-6">
            <!-- Name & manufacturer -->
            <div class="mb-4">
              <h2 class="text-lg font-semibold leading-tight" style="color: #1C1B1F;">
                {{ lens.modelName }}
              </h2>
              <p class="text-sm mt-0.5" style="color: #49454F;">{{ lens.manufacturerName }}</p>
            </div>

            <!-- Spec chips -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="spec-chip">
                <v-icon size="14" class="mr-1">mdi-camera-iris</v-icon>
                {{ lens.minFocalLength }}–{{ lens.maxFocalLength }}mm
              </span>
              <span class="spec-chip">
                <v-icon size="14" class="mr-1">mdi-aperture</v-icon>
                f/{{ lens.maxAperture }}
              </span>
              <span class="spec-chip">
                <v-icon size="14" class="mr-1">mdi-camera-outline</v-icon>
                {{ lens.mountType }}
              </span>
            </div>

            <!-- Price -->
            <div class="mb-5">
              <span class="text-2xl font-bold" style="color: #6750A4;">
                Rp {{ Number(lens.dayPrice).toLocaleString('id-ID') }}
              </span>
              <span class="text-sm ml-1" style="color: #79747E;">/&thinsp;hari</span>
            </div>

            <!-- Per-branch stock -->
            <div class="mb-1 text-xs font-medium tracking-wide uppercase" style="color: #79747E;">
              Ketersediaan per Cabang
            </div>
            <LensStockSummary :lens-id="lens.id" class="mb-6" />

            <!-- Spacer pushes button to bottom -->
            <div class="flex-1" />

            <!-- CTA -->
            <button
              class="
                w-full py-3 rounded-full font-medium text-sm tracking-wide text-white
                transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                shadow-none hover:shadow-md active:scale-95
              "
              style="background: #6750A4;"
              @mouseover="(e) => (e.currentTarget as HTMLElement).style.background = '#5B4397'"
              @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = '#6750A4'"
              @click="openDialog(lens)"
            >
              <v-icon size="18" class="mr-1">mdi-cart-plus</v-icon>
              Pesan Sekarang
            </button>
          </div>
        </div>
      </div>

    </v-container>

    <!-- Order Dialog -->
    <OrderDialog
      v-model="dialogOpen"
      :lens="selectedLens"
      @ordered="onOrdered"
    />

    <!-- Success Snackbar -->
    <v-snackbar
      v-model="snackbar"
      :timeout="4000"
      location="bottom right"
      rounded="pill"
      color="#6750A4"
    >
      <div class="flex items-center justify-center gap-2 w-full text-center" style="color: white;">
        <v-icon color="white">mdi-check-circle</v-icon>
        <span>Pesanan berhasil dibuat!</span>
      </div>
    </v-snackbar>

  </div>
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

<style scoped>
.spec-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #E8DEF8;
  color: #1D192B;
  white-space: nowrap;
}
</style>
