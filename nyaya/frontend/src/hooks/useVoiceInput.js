import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Decodes an audio blob into a 16kHz Float32Array
 * (Whisper model requires 16000Hz mono audio)
 */
async function decodeAudioBlob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  // Decode at native sample rate first
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Resample to 16000Hz
  const offlineContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
    1, // 1 channel (mono)
    audioBuffer.duration * 16000,
    16000
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  const resampledBuffer = await offlineContext.startRendering();
  return resampledBuffer.getChannelData(0); // Float32Array
}

/**
 * useVoiceInput
 *
 * A hook that handles offline Whisper speech recognition via a Web Worker.
 * @param {function} onTranscript - Called with (transcript, isFinal). (isFinal is always true now)
 * @param {function} onError - Called with a human-readable error string on failure.
 */
export function useVoiceInput(onTranscript, onError) {
  const [isListening, setIsListening] = useState(false);
  
  // New States for local AI model
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const workerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  // Keep callback refs fresh
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initialize the Web Worker on mount
  useEffect(() => {
    // Vite worker syntax
    const worker = new Worker(new URL('../workers/whisper.worker.js', import.meta.url), {
      type: 'module'
    });

    worker.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.status) {
        case 'initiate':
          // Model started downloading/loading
          setIsDownloading(true);
          break;
        case 'progress':
          // Model download progress
          // Note: transformers.js sends multiple progress events for different files.
          // We just track the overall percentage of the current file for a simple UI.
          if (message.progress) {
             setDownloadProgress(Math.round(message.progress));
          }
          break;
        case 'done':
          // A file finished downloading
          break;
        case 'ready':
          // Pipeline is ready
          setIsDownloading(false);
          setIsModelReady(true);
          break;
        case 'transcribing':
          setIsTranscribing(true);
          break;
        case 'complete':
          // Transcription finished
          setIsTranscribing(false);
          if (message.text && message.text.trim()) {
            onTranscriptRef.current(message.text.trim(), true);
          }
          break;
        case 'error':
          setIsTranscribing(false);
          setIsDownloading(false);
          onErrorRef.current?.("Local AI Error: " + message.error);
          break;
      }
    });

    workerRef.current = worker;

    // Send init message to pre-load the model
    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
    };
  }, []);

  const startListening = useCallback(async () => {
    if (isListening || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          try {
            // Decode to 16kHz float32
            const audioData = await decodeAudioBlob(audioBlob);
            // Send to worker for transcription
            workerRef.current.postMessage({ type: 'transcribe', audio: audioData });
          } catch (err) {
            console.error("Audio decoding error:", err);
            setIsTranscribing(false);
            onErrorRef.current?.("Failed to process audio format.");
          }
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch (err) {
      console.error("Microphone error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        onErrorRef.current?.("Microphone access was denied. Please allow it in settings.");
      } else if (err.name === 'NotFoundError') {
        onErrorRef.current?.("No microphone found. Please connect one.");
      } else {
        onErrorRef.current?.("Could not access microphone.");
      }
    }
  }, [isListening, isTranscribing]);

  const stopListening = useCallback(() => {
    if (!isListening || !mediaRecorderRef.current) return;
    
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { 
    isListening, 
    isSupported: true, // Always supported if the browser supports standard Web APIs
    startListening, 
    stopListening, 
    toggleListening,
    // New states exposed to UI
    isModelReady,
    isDownloading,
    downloadProgress,
    isTranscribing
  };
}
