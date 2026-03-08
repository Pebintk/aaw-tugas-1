<template>
  <div class="relative min-h-screen overflow-x-hidden" style="background: #FFFBFE;">

    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden -z-0">
      <div
        class="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
        style="background: #6750A4;"
      />
      <div
        class="absolute top-1/3 -left-48 h-[400px] w-[400px] rounded-full opacity-15 blur-3xl"
        style="background: #E8DEF8;"
      />
      <div
        class="absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full opacity-15 blur-3xl"
        style="background: #FFD8E4;"
      />
    </div>

    <v-container fluid class="relative z-10 py-12 px-6 lg:px-12">

      <div class="mb-10 px-8 py-10 rounded-[48px] max-w-7xl mx-auto" style="background: #F3EDF7;">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center"
              style="background: #6750A4;"
            >
              <v-icon color="white" size="28">mdi-clipboard-list-outline</v-icon>
            </div>
            <div>
              <h1 class="text-4xl font-bold tracking-tight" style="color: #1C1B1F; font-family: Roboto, sans-serif;">
                Daftar Pesanan
              </h1>
              <p class="mt-1 text-base" style="color: #49454F;">
                Kelola dan pantau semua pesanan sewa lensa.
              </p>
            </div>
          </div>
          <router-link
            to="/"
            class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 active:scale-95 no-underline"
            style="background: #E8DEF8; color: #6750A4;"
          >
            <v-icon size="18">mdi-arrow-left</v-icon>
            Kembali ke Katalog
          </router-link>
        </div>
      </div>

      <!-- ── Status filter chips ──────────────────────────────────────── -->
      <div v-if="!isLoading && !error && orders?.length" class="max-w-7xl mx-auto mb-6 flex flex-wrap gap-2">
        <button
          v-for="f in filterOptions"
          :key="f.value ?? 'all'"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
          :style="filterStatus === f.value
            ? 'background: #6750A4; color: white;'
            : 'background: #E8DEF8; color: #49454F;'"
          @click="filterStatus = f.value"
        >
          {{ f.label }}
          <span
            class="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-xs font-bold"
            :style="filterStatus === f.value
              ? 'background: rgba(255,255,255,0.25); color: white;'
              : 'background: #D0BCFF; color: #21005D;'"
          >{{ f.count }}</span>
        </button>
      </div>

      <div v-if="isLoading" class="flex flex-wrap justify-center gap-6">
        <div
          v-for="n in 6"
          :key="n"
          class="w-full sm:w-[500px] lg:w-[600px] rounded-[24px] overflow-hidden"
          style="background: #F3EDF7;"
        >
          <v-skeleton-loader type="list-item-three-line" />
        </div>
      </div>

      <div v-else-if="error" class="max-w-4xl mx-auto">
        <v-alert
          type="error"
          variant="tonal"
          rounded="xl"
          title="Gagal memuat pesanan"
          :text="(error as Error).message"
          class="mb-6"
        />
      </div>

      <div v-else-if="!orders?.length" class="max-w-4xl mx-auto">
        <div
          class="flex flex-col items-center justify-center py-20 rounded-[32px]"
          style="background: #F3EDF7;"
        >
          <div
            class="h-20 w-20 rounded-full flex items-center justify-center mb-5"
            style="background: #E8DEF8;"
          >
            <v-icon size="40" style="color: #6750A4;">mdi-clipboard-off-outline</v-icon>
          </div>
          <p class="text-lg font-semibold" style="color: #1C1B1F;">Belum ada pesanan</p>
          <p class="text-sm mt-1 mb-6" style="color: #49454F;">Mulai sewa lensa dari halaman katalog.</p>
          <router-link
            to="/"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white no-underline transition-all duration-200 active:scale-95"
            style="background: #6750A4;"
          >
            <v-icon size="18" color="white">mdi-camera-iris</v-icon>
            Lihat Katalog
          </router-link>
        </div>
      </div>

      <div v-else class="flex flex-wrap justify-center gap-6">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="w-full sm:w-[500px] lg:w-[600px] flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm hover:shadow-md"
          style="background: #F3EDF7;"
        >
          <div class="h-1.5 w-full flex-shrink-0" :style="{ background: statusGradient(order.status) }" />

          <div class="p-6 flex flex-col h-full">
            <div class="flex flex-col sm:flex-row items-start justify-between gap-4 flex-1">

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    :style="statusChipStyle(order.status)"
                  >
                    <v-icon size="12">{{ statusIcon(order.status) }}</v-icon>
                    {{ statusLabel(order.status) }}
                  </span>
                  <span class="text-xs font-mono" style="color: #79747E;">{{ order.id.slice(0, 8).toUpperCase() }}</span>
                </div>

                <h2 class="text-base font-semibold truncate" style="color: #1C1B1F;">
                  {{ order.lensSnapshot.modelName }}
                </h2>
                <p class="text-sm" style="color: #49454F;">{{ order.lensSnapshot.manufacturerName }}</p>

                <div class="flex flex-wrap gap-2 mt-3 mb-4">
                  <span class="meta-chip">
                    <v-icon size="13" class="mr-1">mdi-account</v-icon>
                    {{ order.customerName }}
                  </span>
                  <span class="meta-chip">
                    <v-icon size="13" class="mr-1">mdi-store</v-icon>
                    {{ order.branchCode }}
                  </span>
                  <span class="meta-chip">
                    <v-icon size="13" class="mr-1">mdi-calendar-range</v-icon>
                    {{ formatDate(order.startDate) }} – {{ formatDate(order.endDate) }}
                  </span>
                  <span class="meta-chip">
                    <v-icon size="13" class="mr-1">mdi-clock-time-four-outline</v-icon>
                    {{ rentalDays(order) }} hari
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-start sm:items-end gap-1 flex-shrink-0 mb-4 sm:mb-0">
                <p class="text-xl font-bold" style="color: #6750A4;">
                  Rp {{ Number(order.totalPrice).toLocaleString('id-ID') }}
                </p>
                <p class="text-xs" style="color: #79747E;">
                  Rp {{ Number(order.lensSnapshot.dayPrice).toLocaleString('id-ID') }}/hari
                </p>
              </div>
            </div>

            <div class="flex-1" />

            <div class="flex justify-end mt-2 pt-4 border-t border-gray-200" style="border-color: #E7E0EC;">
              <button
                v-if="order.status !== 'cancelled' && order.status !== 'returned'"
                class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 w-full sm:w-auto cursor-pointer"
                style="background: #FEE2E2; color: #991B1B;"
                :disabled="cancellingId === order.id"
                @click="confirmCancel(order)"
              >
                <v-progress-circular
                  v-if="cancellingId === order.id"
                  indeterminate
                  size="12"
                  width="2"
                  color="#991B1B"
                />
                <template v-else>
                  <v-icon size="14">mdi-cancel</v-icon>
                  Batalkan Pesanan
                </template>
              </button>
            </div>

          </div>
        </div>
      </div>

    </v-container>

    <v-dialog v-model="cancelDialog" max-width="400">
      <div
        class="overflow-hidden"
        style="background: #FFFBFE; border-radius: 28px; box-shadow: 0 8px 32px rgba(103,80,164,0.18);"
      >
        <div class="px-7 pt-7 pb-5">
          <div class="flex items-start gap-4 mb-4">
            <div
              class="flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center"
              style="background: #FEE2E2;"
            >
              <v-icon size="22" style="color: #991B1B;">mdi-alert-outline</v-icon>
            </div>
            <div>
              <h3 class="text-lg font-semibold" style="color: #1C1B1F;">Batalkan Pesanan?</h3>
              <p class="text-sm mt-1" style="color: #49454F;">
                Pesanan untuk
                <strong>{{ pendingCancelOrder?.lensSnapshot.modelName }}</strong>
                akan dibatalkan dan stok akan dikembalikan.
              </p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 px-7 pb-6">
          <button
            class="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 cursor-pointer"
            style="color: #6750A4;"
            @click="cancelDialog = false"
          >
            Tidak
          </button>
          <button
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white transition-all duration-200 active:scale-95 cursor-pointer"
            style="background: #B3261E;"
            @click="executeCancel"
          >
            <v-icon size="16" color="white">mdi-cancel</v-icon>
            Ya, Batalkan
          </button>
        </div>
      </div>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" :timeout="4000" location="bottom right" rounded="pill" color="#6750A4">
      <div class="flex items-center justify-center gap-2 w-full text-center" style="color: white;">
        <v-icon color="white">mdi-check-circle</v-icon>
        <span>Pesanan berhasil dibatalkan.</span>
      </div>
    </v-snackbar>

    <v-snackbar v-model="errorSnackbar" :timeout="5000" location="bottom right" rounded="pill" color="#B3261E">
      <div class="flex items-center justify-center gap-2 w-full text-center" style="color: white;">
        <v-icon color="white">mdi-alert-circle</v-icon>
        <span>{{ cancelError }}</span>
      </div>
    </v-snackbar>

  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useOrders, useCancelOrder, type Order } from '@/composables/UseOrders';

const { data: orders, isLoading, error } = useOrders();
const { mutateAsync: cancelOrder } = useCancelOrder();

// ── Sort: newest first ──────────────────────────────────────────────────────
const sortedOrders = computed(() =>
  [...(orders.value ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ),
);

// ── Status filter ─────────────────────────────────────────────────────────
const filterStatus = ref<Order['status'] | null>(null);

const filteredOrders = computed(() =>
  filterStatus.value === null
    ? sortedOrders.value
    : sortedOrders.value.filter((o) => o.status === filterStatus.value),
);

const ALL_STATUSES: Order['status'][] = ['pending', 'confirmed', 'active', 'returned', 'cancelled'];

const filterOptions = computed(() => {
  const all = sortedOrders.value;
  const countOf = (s: Order['status']) => all.filter((o) => o.status === s).length;
  return [
    { label: 'Semua', value: null, count: all.length },
    ...ALL_STATUSES
      .filter((s) => countOf(s) > 0)
      .map((s) => ({ label: statusLabel(s), value: s, count: countOf(s) })),
  ];
});

// ── Cancel flow ─────────────────────────────────────────────────────────────
const cancelDialog = ref(false);
const pendingCancelOrder = ref<Order | null>(null);
const cancellingId = ref<string | null>(null);
const successSnackbar = ref(false);
const errorSnackbar = ref(false);
const cancelError = ref('');

function confirmCancel(order: Order) {
  pendingCancelOrder.value = order;
  cancelDialog.value = true;
}

async function executeCancel() {
  if (!pendingCancelOrder.value) return;
  const order = pendingCancelOrder.value;
  cancelDialog.value = false;
  cancellingId.value = order.id;

  try {
    await cancelOrder(order.id);
    successSnackbar.value = true;
  } catch (err) {
    cancelError.value = err instanceof Error ? err.message : 'Gagal membatalkan pesanan.';
    errorSnackbar.value = true;
  } finally {
    cancellingId.value = null;
    pendingCancelOrder.value = null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function rentalDays(order: Order) {
  const start = new Date(order.startDate);
  const end = new Date(order.endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Status helpers ───────────────────────────────────────────────────────────
function statusLabel(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending: 'Menunggu',
    confirmed: 'Dikonfirmasi',
    active: 'Aktif',
    returned: 'Dikembalikan',
    cancelled: 'Dibatalkan',
  };
  return map[status];
}

function statusIcon(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending: 'mdi-clock-outline',
    confirmed: 'mdi-check-circle-outline',
    active: 'mdi-camera-iris',
    returned: 'mdi-package-variant-closed-check',
    cancelled: 'mdi-cancel',
  };
  return map[status];
}

function statusChipStyle(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending: 'background: #FFF3CD; color: #664D03;',
    confirmed: 'background: #DCFCE7; color: #166534;',
    active: 'background: #DBEAFE; color: #1E40AF;',
    returned: 'background: #E7E0EC; color: #49454F;',
    cancelled: 'background: #FEE2E2; color: #991B1B;',
  };
  return map[status];
}

function statusGradient(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending: 'linear-gradient(90deg, #F59E0B 0%, #FCD34D 100%)',
    confirmed: 'linear-gradient(90deg, #22C55E 0%, #86EFAC 100%)',
    active: 'linear-gradient(90deg, #3B82F6 0%, #93C5FD 100%)',
    returned: 'linear-gradient(90deg, #79747E 0%, #CAC4D0 100%)',
    cancelled: 'linear-gradient(90deg, #EF4444 0%, #FCA5A5 100%)',
  };
  return map[status];
}
</script>

<style scoped>
.meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #E8DEF8;
  color: #1D192B;
  white-space: nowrap;
}
</style>
