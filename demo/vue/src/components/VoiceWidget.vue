<template>
  <div class="voice-widget">
    <h2>VoiceWidget</h2>
    <h3>
      <label>
        AccessKey obtained from
        <a href="https://console.picovoice.ai/">Picovoice Console</a>:
        <input
          type="text"
          name="accessKey"
          v-on:change="updateAccesskey"
          :disabled="isLoaded"
        />
      </label>
      <button class="start-button" v-on:click="rhnInit">
          Start Rhino
      </button>
    </h3>
    <h3>Rhino Loaded: {{ isLoaded }}</h3>
    <h3>Listening: {{ isListening }}</h3>
    <h3>Error: {{ error !== null }}</h3>
    <p class="error-message" v-if="error !== null">
      {{ JSON.stringify(error) }}
    </p>
    <button v-on:click="rhnProcess" :disabled="error !== null || isListening || !isLoaded">
      Process
    </button>
    <button v-on:click="rhnRelease" :disabled="error !== null || isListening || !isLoaded">
      Release
    </button>
    <h3>Inference:</h3>
    <pre v-if="inference !== null">{{ JSON.stringify(inference, null, 2) }}</pre>
    <hr />
    <div>
      <h3>Context Info:</h3>
      <pre>
      {{ contextInfo }}
      </pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { RhinoInference } from "@picovoice/rhino-web";
import rhinoMixin, { RhinoVue } from "@picovoice/rhino-vue";
// @ts-ignore
import rhinoParams from "@/lib/rhino_params";
const VoiceWidget = defineComponent({
  name: "VoiceWidget",
  mixins: [rhinoMixin],
  data() {
    return {
      accessKey: "",
      inference: null as RhinoInference | null,
      error: null as Error | string | null,
      isLoaded: false,
      isListening: false,
      contextInfo: null as string | null,
      $rhino: {} as RhinoVue,
    };
  },
  methods: {
    rhnProcess: function () {
      this.$rhino.process();
    },
    rhnRelease: function () {
      this.$rhino.release();
    },
    rhnInit: function () {
      const rhinoContext = { publicPath: "clock_wasm.rhn" };
      const rhinoModel = { base64: rhinoParams };

      this.$rhino.init(
        this.accessKey,
        rhinoContext,
        this.inferenceCallback,
        rhinoModel,
        this.contextInfoCallback,
        this.isLoadedCallback,
        this.isListeningCallback,
        this.errorCallback
      );
    },
    updateAccesskey: function (event: any) {
      this.accessKey = event.target.value;
    },
    contextInfoCallback: function (context: string) {
      this.contextInfo = context;
    },
    inferenceCallback: function (
      inference: RhinoInference
    ) {
      this.inference = inference;
    },
    isLoadedCallback: function (isLoaded: boolean) {
      this.isLoaded = isLoaded;
    },
    isListeningCallback: function (isListening: boolean) {
      this.isListening = isListening;
    },
    errorCallback: function (error: string | null) {
      this.error = error;
    },
  },
});

export default VoiceWidget;
</script>

<style scoped>
button {
  padding: 1rem;
  font-size: 1.5rem;
  margin-right: 1rem;
}

.start-button {
  padding: 0.1rem;
  font-size: 1rem;
  margin-left: 0.5rem;
}

.voice-widget {
  border: 2px double #377dff;
  padding: 2rem;
}

.error-message {
  background-color: maroon;
  color: white;
  padding: 1rem;
  border-left: 5px solid red;
  font-family: monospace;
  font-weight: bold;
  font-size: 1.5rem;
}
</style>
