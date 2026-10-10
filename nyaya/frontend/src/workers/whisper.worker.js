import { pipeline, env } from '@xenova/transformers';

// Skip local model check (we are fetching from HuggingFace hub and caching it in the browser)
env.allowLocalModels = false;

// We use the tiny English model for maximum speed while maintaining good accuracy
const MODEL_NAME = 'Xenova/whisper-tiny.en';

class PipelineSingleton {
    static task = 'automatic-speech-recognition';
    static model = MODEL_NAME;
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    try {
        // Initialize the pipeline (this will download the model if it's not cached)
        let transcriber = await PipelineSingleton.getInstance(x => {
            // Send progress updates back to the main thread (for the loading bar)
            self.postMessage(x);
        });

        if (event.data.type === 'init') {
            // Send ready signal when initialized
            self.postMessage({ status: 'ready' });
            return;
        }

        if (event.data.type === 'transcribe') {
            const { audio } = event.data; // Expected to be Float32Array of 16kHz audio

            self.postMessage({ status: 'transcribing' });

            // Run the model on the audio array
            let result = await transcriber(audio, {
                chunk_length_s: 30, // process in 30-second chunks if it's long
                stride_length_s: 5,
            });
            
            // Send the result back
            self.postMessage({ status: 'complete', text: result.text });
        }
    } catch (err) {
        console.error("Whisper Worker Error:", err);
        self.postMessage({ status: 'error', error: err.message });
    }
});
