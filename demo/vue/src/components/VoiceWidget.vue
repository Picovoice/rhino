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
      <button class="start-button" v-on:click="rhnInit" :disabled="isLoaded || accessKey.length == 0">
          Start Rhino
      </button>
    </h3>
    <h3>Rhino Loaded: {{ isLoaded }}</h3>
    <h3>Listening: {{ isListening }}</h3>
    <h3>Error: {{ error !== null }}</h3>
    <p class="error-message" v-if="error !== null">
      {{ JSON.stringify(errorMessage) }}
    </p>
    <button v-on:click="rhnProcess" :disabled="error !== null || isListening || !isLoaded">
      Process
    </button>
    <button v-on:click="rhnRelease" :disabled="error !== null || !isListening || !isLoaded">
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
import Vue, { VueConstructor } from "vue";

import rhinoMixin, { RhinoVue } from "@picovoice/rhino-web-vue";
import { RhinoInference } from "@picovoice/rhino-web";

import { MODEL_BASE_64 } from "../dist/rhn_model_base64";
import { CONTEXT_BASE_64 } from "../dist/rhn_context_base64";

export default (Vue as VueConstructor<Vue & {$rhino: RhinoVue}>).extend({
  name: "VoiceWidget",
  mixins: [rhinoMixin],
  data: function () {
    return {
      accessKey: "",
      inference: null as RhinoInference | null,
      error: null as Error | string | null,
      isLoaded: false,
      isListening: false,
      contextInfo: null as string | null,
    };
  },
  methods: {
    updateAccesskey: function (event: any) {
      this.accessKey = event.target.value;
    },
    rhnInit: function (event: any) {
      this.error = null;
      this.isLoaded = false;
      this.isListening = false;

      const rhinoContext = { base64: CONTEXT_BASE_64 };
      const rhinoModel = { base64: MODEL_BASE_64 };
      const rhinoOptions = {};

      this.$rhino.init(
        this.accessKey,
        rhinoContext,
        this.rhnInferenceFn,
        rhinoModel,
        rhinoOptions,
        this.rhnContextFn
        this.rhnIsLoadedFn,
        this.rhnIsListeningFn,
        this.rhnErrorFn
      )
    },
    rhnProcess: function () {
      this.$rhino.process();
    },
    rhnRelease: function () {
      this.$rhino.release();
    },
    rhnInferenceFn: function (inference: RhinoInference) {
      this.inference = inference;
    },
    rhnContextFn: function (info: string) {
      this.contextInfo = info;
    },
    rhnIsLoadedFn: function (isLoaded: boolean) {
      this.isLoaded = isLoaded;
    },
    rhnIsListeningFn: function (isListening: boolean) {
      this.isListening = isListening;
    },
    rhnErrorFn: function (error: Error) {
      this.error = error;
    },
  },
});
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
