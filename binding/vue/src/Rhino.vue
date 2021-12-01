<template>
  <div>
    <slot />
  </div>
</template>

<script>
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';


/**
 * Rhino Vue Component
 * 
 * Props
 * - rhinoFactoryArgs: Arguments for RhinoWorkerFactory.
 * - rhinoFactory: The language-specific worker factory.
 * 
 * Events
 * - rhn-ready: A method invoked after the component has initialized.
 * - rhn-info: A method invoked after the component has initialized and has context information.
 * - rhn-inference: A method invoked upon completion of intent inference.
 * - rhn-error: A method invoked if an error occurs within initialization.
 */
export default {
  name: 'Rhino',
  props: {
    rhinoFactoryArgs: [Object],
    rhinoFactory: [Function],
  },
  data: function () {
    return { webVp: null, rhnWorker: null, contextInfo: null };
  },
  methods: {
    /**
     * Initializes RhinoWorkerFactory and Web Voice processor.
     */
    initEngine: async function () {
      this.$emit('rhn-loading');
      try {
        const { accessKey, context, requireEndpoint } = this.rhinoFactoryArgs;
        this.rhnWorker = await this.rhinoFactory.create({
          accessKey,
          context: JSON.parse(JSON.stringify(context)),
          requireEndpoint
        });
        this.webVp = await WebVoiceProcessor.init({
          engines: [this.rhnWorker],
        });
        let _this = this;

        this.rhnWorker.onmessage = messageEvent => {
          switch (messageEvent.data.command) {
            case 'rhn-inference':
              _this.$emit('rhn-inference', messageEvent.data.inference);
              // Reset Push-to-Talk
              this.rhnWorker.postMessage({ command: 'pause' });
              break;
            case 'rhn-info':
              const info = messageEvent.data.info;
              this.contextInfo = info;
              this.$emit('rhn-info', info);
              break;
          }
        };
        this.rhnWorker.postMessage({ command: 'info' });
        this.$emit('rhn-ready');

      } catch (error) {
        this.$emit('rhn-error', error);
      }
    },
    /**
     * Method to start processing audio.
     */
    start() {
      if (this.webVp !== null) {
        this.webVp.start();
        return true;
      }
      return false;
    },
    /**
     * Method to stop processing audio.
     */
    pause() {
      if (this.webVp !== null) {
        this.webVp.pause();
        return true;
      }
      return false;
    },
    /**
     * Method to put Rhino in an active isTalking state.
     */
    pushToTalk() {
      if (this.webVp !== null) {
        this.webVp.resume();
        this.rhnWorker.postMessage({ command: 'resume' });
        return true;
      }
      return false;
    },
  },
  beforeUnmount: function () {
    if (this.webVp !== null) {
      this.webVp.release();
      this.webVp = null;
    }
    if (this.rhnWorker !== null) {
      this.rhnWorker.postMessage({ command: 'release' });
      this.rhnWorker = null;
    }
  },
};
</script>
