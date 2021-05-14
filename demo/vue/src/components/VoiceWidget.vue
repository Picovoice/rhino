<template>
  <div class="voice-widget">
    <Rhino
      ref="rhino"
      v-bind:rhinoFactoryArgs="{
        context: {
          base64: context64,
        },
      }"
      v-bind:rhinoFactory="factory"
      v-on:rhn-init="rhnInitFn"
      v-on:rhn-ready="rhnReadyFn"
      v-on:rhn-inference="rhnInferenceFn"
      v-on:rhn-error="rhnErrorFn"
      v-on:rhn-info="rhnInfoFn"
    />
    <h2>VoiceWidget</h2>
    <h3>Loaded: {{ isLoaded }}</h3>
    <h3>Listening: {{ isListening }}</h3>
    <h3>Talking: {{ isTalking }}</h3>
    <h3>Error: {{ isError }}</h3>
    <p class="error-message" v-if="isError">
      {{ JSON.stringify(errorMessage) }}
    </p>
    <button v-on:click="start" :disabled="!isLoaded || isError || isListening">
      Start
    </button>
    <button v-on:click="pause" :disabled="!isLoaded || isError || !isListening">
      Pause
    </button>
    <button v-on:click="resume" :disabled="!isLoaded || isError || isListening">
      Resume
    </button>
    <button
      v-on:click="pushToTalk"
      :disabled="!isLoaded || isError || !isListening || isTalking"
    >
      Push to Talk
    </button>
    <h3>Inference:</h3>
    <code v-if="inference !== null">
      {{ inference }}
    </code>
    <br />
    <div>
      <h2>Context Info</h2>
      <pre>
      {{ contextInfo }}
      </pre>
    </div>
  </div>
</template>

<script>
import Rhino from "@picovoice/rhino-web-vue";
import { RhinoWorkerFactory as RhinoWorkerFactoryEn } from "@picovoice/rhino-web-en-worker";
import { CLOCK_EN_64 } from "../dist/rhn_contexts_base64";

export default {
  name: "VoiceWidget",
  components: {
    Rhino,
  },
  data: function () {
    return {
      inference: null,
      isError: false,
      isLoaded: false,
      isListening: false,
      isTalking: false,
      context64: CLOCK_EN_64,
      contextInfo: null,
      factory: RhinoWorkerFactoryEn,
    };
  },
  methods: {
    start: function () {
      if (this.$refs.rhino.start()) {
        this.isListening = !this.isListening;
      }
    },
    pause: function () {
      if (this.$refs.rhino.pause()) {
        this.isListening = !this.isListening;
      }
    },
    resume: function () {
      if (this.$refs.rhino.resume()) {
        this.isListening = !this.isListening;
      }
    },
    pushToTalk: function () {
      if (this.$refs.rhino.pushToTalk()) {
        this.isTalking = true;
      }
    },

    rhnInitFn: function () {
      this.isError = false;
    },
    rhnInfoFn: function (info) {
      this.contextInfo = info;
    },
    rhnReadyFn: function () {
      this.isLoaded = true;
      this.isListening = true;
    },
    rhnInferenceFn: function (inference) {
      this.inference = inference;
      this.isTalking = false;
    },
    rhnErrorFn: function (error) {
      this.isError = true;
      this.errorMessage = error.toString();
    },
  },
};
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
