<template>
  <div class="skeleton-box" :style="{ width: width, height: height, borderRadius: radius }"></div>
</template>

<script setup>
  defineProps({
    width: {
      type: String,
      default: '100%',
    },
    height: {
      type: String,
      default: '20px',
    },
    radius: {
      type: String,
      default: '4px',
    },
  })
</script>

<style scoped>
  .skeleton-box {
    display: inline-block;
    background-color: #e2e8f0; /* Color base gris claro */
    animation: pulse 1.5s infinite ease-in-out;
  }

  @keyframes pulse {
    0% {
      background-color: #e2e8f0;
    }
    50% {
      background-color: #cbd5e1; /* Color un poco más oscuro a la mitad */
    }
    100% {
      background-color: #e2e8f0;
    }
  }
</style>
