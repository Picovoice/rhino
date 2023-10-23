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
          v-on:change="updateAccessKey"
          :disabled="state.isLoaded"
        />
      </label>
      <button class="start-button" v-on:click="rhnInit">Init Rhino</button>
    </h3>
    <h3>Rhino Loaded: {{ state.isLoaded }}</h3>
    <h3>Listening: {{ state.isListening }}</h3>
    <h3>Error: {{ state.error !== null }}</h3>
    <p class="error-message" v-if="state.error !== null">
      {{ state.error.message }}
    </p>
    <button
      v-on:click="rhnProcess"
      :disabled="state.error !== null || state.isListening || !state.isLoaded"
    >
      Process
    </button>
    <button
      v-on:click="rhnRelease"
      :disabled="state.error !== null || state.isListening || !state.isLoaded"
    >
      Release
    </button>
    <h3>Inference:</h3>
    <pre v-if="state.inference !== null">{{
      JSON.stringify(state.inference, null, 2)
    }}</pre>
    <hr />
    <div>
      <h3>Context Name: {{ contextName }}</h3>
      <h3>Context Info:</h3>
      <pre>
      {{ state.contextInfo }}
      </pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, ref } from "vue";
import { useRhino } from "@picovoice/rhino-vue";

// @ts-ignore
import rhinoContext from "../lib/rhinoContext";

// @ts-ignore
import rhinoModel from "../lib/rhinoModel";

const VoiceWidget = defineComponent({
  name: "VoiceWidget",
  setup() {
    const { state, init, process, release } = useRhino();

    const contextName = rhinoContext.publicPath
      .split("/")
      .pop()
      .replace("_wasm.rhn", "");
    const accessKey = ref("");

    const updateAccessKey = (event: any) => {
      accessKey.value = event.target.value;
    };

    const rhnInit = () => {
      init(accessKey.value, rhinoContext, rhinoModel);
    };

    onBeforeUnmount(() => {
      release();
    });

    return {
      state,
      accessKey,
      updateAccessKey,
      contextName,
      rhnInit,
      rhnProcess: process,
      rhnRelease: release,
    };
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
  font-size: 1.2rem;
  white-space: pre;
  overflow-wrap: break-word;
}
</style>
