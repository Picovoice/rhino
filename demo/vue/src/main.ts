import { createApp } from "vue";
import App from "./App.vue";

const rhinoDemoApp = createApp(App)
rhinoDemoApp.component('VoiceWidget',
  () => import('./components/VoiceWidget.vue')
)
rhinoDemoApp.mount("#app");
