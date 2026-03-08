<template>
  <template v-if="isLoading">
    <v-progress-linear indeterminate color="primary" rounded height="2" />
  </template>

  <template v-else-if="isError">
    <span class="text-caption text-error">Gagal memuat stok</span>
  </template>

  <template v-else-if="!data?.length">
    <span class="text-caption text-medium-emphasis">Tidak ada data stok</span>
  </template>

  <template v-else>
    <div class="d-flex flex-wrap gap-1">
      <v-chip
        v-for="item in data"
        :key="item.branchCode"
        :color="item.availableQuantity > 0 ? 'success' : 'error'"
        size="small"
        variant="tonal"
      >
        {{ item.branchName }}: {{ item.availableQuantity }} unit
      </v-chip>
    </div>
  </template>
</template>

<script lang="ts" setup>
import { useInventoryByLens } from '@/composables/UseInventory';

const props = defineProps<{ lensId: string }>();

const { data, isLoading, isError } = useInventoryByLens(props.lensId);
</script>
