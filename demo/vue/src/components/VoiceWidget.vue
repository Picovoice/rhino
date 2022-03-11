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
          v-on:change="initEngine"
          :disabled="isLoaded"
        />
      </label>
    </h3>
    <h3>Rhino Loaded: {{ isLoaded }}</h3>
    <h3>Listening: {{ isListening }}</h3>
    <h3>Error: {{ isError }}</h3>
    <p class="error-message" v-if="isError">
      {{ JSON.stringify(errorMessage) }}
    </p>
    <h3>Talking: {{ isTalking }}</h3>
    <button v-on:click="start" :disabled="!isLoaded || isError || isListening">
      Start
    </button>
    <button v-on:click="pause" :disabled="!isLoaded || isError || !isListening">
      Pause
    </button>
    <button
      v-on:click="pushToTalk"
      :disabled="!isLoaded || isError || !isListening || isTalking"
    >
      Push to Talk
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
import { RhinoWorkerFactory as RhinoWorkerFactoryEn } from "@picovoice/rhino-web-en-worker";
import { RhinoInference } from "@picovoice/rhino-web-core";
import { CLOCK_EN_64 } from "../dist/rhn_contexts_base64";

export default (Vue as VueConstructor<Vue & {$rhino: RhinoVue}>).extend({
  name: "VoiceWidget",
  mixins: [rhinoMixin],
  data: function () {
    return {
      inference: null as RhinoInference | null,
      isError: false,
      errorMessage: "",
      isLoaded: false,
      isListening: false,
      isTalking: false,
      contextInfo: null as string | null,
      factory: RhinoWorkerFactoryEn,
      factoryArgs: {
        accessKey: "",
        context: {
          base64: CLOCK_EN_64
        },
        start: false
      }
    };
  },
  methods: {
    initEngine: function (event: any) {
      this.factoryArgs.accessKey = event.target.value;
      this.isError = false;
      this.isLoaded = false;
      this.isListening = false;
      this.$rhino.init(
        this.factoryArgs,
        this.factory,
        this.rhnInferenceFn,
        this.rhnInfoFn,
        this.rhnReadyFn,
        this.rhnErrorFn
      )
    },
    start: function () {
      if (this.$rhino.start()) {
        this.isListening = !this.isListening;
      }
    },
    pause: function () {
      if (this.$rhino.pause()) {
        this.isListening = !this.isListening;
      }
    },
    pushToTalk: function () {
      if (this.$rhino.pushToTalk()) {
        this.isTalking = true;
      }
    },
    rhnInfoFn: function (info: string) {
      this.contextInfo = info;
    },
    rhnReadyFn: function () {
      this.isLoaded = true;
      this.isListening = true;
    },
    rhnInferenceFn: function (inference: RhinoInference) {
      this.inference = inference;
      this.isTalking = false;
    },
    rhnErrorFn: function (error: Error) {
      this.isError = true;
      this.errorMessage = error.toString();
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
