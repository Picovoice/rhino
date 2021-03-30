<template>
  <div>
    <slot />
  </div>
</template>

<script>
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

export default {
  name: 'Rhino',
  props: {
    rhinoFactoryArgs: [Object],
    rhinoFactory: [Function],
  },
  data: function () {
    return { webVp: null, rhnWorker: null };
  },
  methods: {
    start() {
      if (this.webVp !== null) {
        this.webVp.start();
        return true;
      }
      return false;
    },
    pause() {
      if (this.webVp !== null) {
        this.webVp.pause();
        return true;
      }
      return false;
    },
    resume() {
      if (this.webVp !== null) {
        this.webVp.resume();
        return true;
      }
      return false;
    },
    pushToTalk() {
      if (this.webVp !== null) {
        this.webVp.resume();
        this.rhnWorker.postMessage({ command: 'resume' });
        return true;
      }
      return false;
    },
  },
  async created() {
    this.$emit('rhn-loading');

    try {
      this.rhnWorker = await this.rhinoFactory.create(this.rhinoFactoryArgs);
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
        }
      };
    } catch (error) {
      this.$emit('rhn-error', error);
    }

    this.$emit('rhn-ready');
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
