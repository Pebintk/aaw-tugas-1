<template>
  <!-- Loading -->
  <div v-if="isLoading" class="flex items-center gap-2 py-1">
    <div
      class="h-1.5 w-full rounded-full overflow-hidden"
      style="background: #E8DEF8;"
    >
      <div
        class="h-full w-1/2 rounded-full animate-pulse"
        style="background: #6750A4;"
      />
    </div>
  </div>

  <!-- Error -->
  <span v-else-if="isError" class="text-xs" style="color: #B3261E;">
    Gagal memuat stok
  </span>

  <!-- No data -->
  <span v-else-if="!data?.length" class="text-xs" style="color: #79747E;">
    Tidak ada data stok
  </span>

  <!-- Stock chips -->
  <div v-else class="flex flex-wrap gap-1.5">
    <span
      v-for="item in data"
      :key="item.branchCode"
      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
      :style="item.availableQuantity > 0
        ? 'background: #DCFCE7; color: #166534;'
        : 'background: #FEE2E2; color: #991B1B;'"
    >
      <span
        class="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
        :style="item.availableQuantity > 0 ? 'background:#166534;' : 'background:#991B1B;'"
      />
      {{ item.branchName }}: {{ item.availableQuantity }} unit
    </span>
  </div>
</template>

<script lang="ts" setup>
import { useInventoryByLens } from '@/composables/UseInventory';

const props = defineProps<{ lensId: string }>();

const { data, isLoading, isError } = useInventoryByLens(props.lensId);
</script>
