<template>
  <div class="rhino-vue-demo">
    <h1>Rhino Web + Vue ("Rhino" Component)</h1>
    <VoiceWidget />
  </div>
</template>

<script lang="ts">
import { defineComponent, defineAsyncComponent } from "vue";
export default defineComponent({
  name: "App",
  components: {
    VoiceWidget: defineAsyncComponent(
      () => import("./components/VoiceWidget.vue")
    ),
  },
  data: function () {
    return { show: true };
  },
  methods: {
    toggle: function () {
      this.show = !this.show;
    },
  },
});
</script>

<style scoped>
body {
  padding: 2rem;
}

button {
  padding: 1rem;
  font-size: 1.5rem;
  margin-right: 1rem;
}
</style>
