package ai.picovoice.rhinodemo;

interface AudioConsumer {
    void consume(short[] pcm) throws Exception;

    int getFrameLength();

    int getSampleRate();
}
