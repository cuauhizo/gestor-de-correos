<script setup>
</script>

<template>
  <main>
    <header>
      <img alt="Tolko logo" class="logo" src="@/assets/logo.png" width="125" height="125" />
    </header>
    <router-view />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

</style>
