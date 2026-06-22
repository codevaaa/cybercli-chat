/**
 * VoiceRecorder — Opus/WebM recording using opus-recorder (WebAssembly libopus)
 *
 * Implements:
 *  - startRecording(): request mic permission gate, start Ogg/Opus recording at ≥16 kHz mono
 *  - stopRecording(): stop recording, return Ogg/Opus Blob
 *  - Auto-stop at 300 seconds (5 minutes) (REQ-8.2, REQ-8.3)
 *  - MIC_PERMISSION_DENIED error surfaced only at record-start time (REQ-8.6)
 *
 * The recorder implementation is injectable for testability (WASM may not load
 * in test environments). Pass a `MockRecorderFactory` during unit tests.
 *
 * REQ-8.1, REQ-8.2, REQ-8.3, REQ-8.6
 */

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type VoiceError =
  | { type: 'MIC_PERMISSION_DENIED' }
  | { type: 'RECORDING_ERROR'; reason: string }

// ---------------------------------------------------------------------------
// Recorder interface for dependency injection
// ---------------------------------------------------------------------------

export interface IRecorderInstance {
  /** Start recording. Rejects if mic is unavailable. */
  start(): Promise<void>
  /** Stop recording and return the Ogg/Opus blob. */
  stop(): Promise<Blob>
}

export type RecorderFactory = () => IRecorderInstance

// ---------------------------------------------------------------------------
// Real opus-recorder factory (browser only)
// ---------------------------------------------------------------------------

/**
 * Create an IRecorderInstance backed by the real opus-recorder library.
 * In test environments, pass a mock factory instead.
 */
function createOpusRecorderInstance(): IRecorderInstance {
  // We import opus-recorder lazily to avoid WASM loading in non-browser envs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recorderRef: any = null
  let stream: MediaStream | null = null
  let blobResolve: ((b: Blob) => void) | null = null
  let blobReject: ((e: unknown) => void) | null = null

  return {
    async start(): Promise<void> {
      // Microphone permission gate — check before any WASM load
      let mediaStream: MediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
      } catch (err) {
        const domErr = err as { name?: string }
        if (
          domErr.name === 'NotAllowedError' ||
          domErr.name === 'PermissionDeniedError'
        ) {
          throw { type: 'MIC_PERMISSION_DENIED' } as VoiceError
        }
        throw { type: 'RECORDING_ERROR', reason: String(err) } as VoiceError
      }

      stream = mediaStream

      // Dynamically import opus-recorder
      const { default: Recorder } = await import('opus-recorder')

      recorderRef = new Recorder({
        encoderPath: '/opus-recorder/encoderWorker.min.js',
        encoderApplication: 2048, // VOIP mode — good for voice at 16 kHz
        encoderSampleRate: 16000,
        numberOfChannels: 1,
        mediaTrackConstraints: false, // we already have the stream
        streamPages: false,
      })

      // Collect data from the recorder
      recorderRef.ondataavailable = (_data: ArrayBuffer) => {
        // Accumulated internally by recorder; resolved in stop()
      }

      recorderRef.onstop = () => {
        const exportRef: typeof recorderRef = recorderRef
        if (exportRef && typeof exportRef.exportWAV === 'function') {
          // Some versions expose exportWAV; opus-recorder exposes encoded blobs
        }
        // Blob is delivered via the promise chain set up in stop()
      }

      await recorderRef.start(mediaStream)
    },

    async stop(): Promise<Blob> {
      if (!recorderRef) {
        throw { type: 'RECORDING_ERROR', reason: 'Recorder not started' } as VoiceError
      }

      return new Promise<Blob>((resolve, reject) => {
        blobResolve = resolve
        blobReject = reject

        recorderRef.onstop = (blob: Blob) => {
          if (stream) {
            stream.getTracks().forEach((t) => t.stop())
            stream = null
          }
          blobResolve!(blob)
        }

        recorderRef.onerror = (err: unknown) => {
          blobReject!(err)
        }

        recorderRef.stop()
      })
    },
  }
}

// ---------------------------------------------------------------------------
// VoiceRecorder class
// ---------------------------------------------------------------------------

export const MAX_RECORDING_DURATION_MS = 300_000 // 5 minutes

export class VoiceRecorder {
  private _recorder: IRecorderInstance | null = null
  private _autoStopTimer: ReturnType<typeof setTimeout> | null = null
  private _isRecording = false
  private _autoStopCallback: (() => void) | null = null

  /** Duration at which recording auto-stops (injectable for tests) */
  private readonly _maxDurationMs: number

  /** Factory for creating recorder instances (injectable for tests) */
  private readonly _factory: RecorderFactory

  constructor(
    options: {
      factory?: RecorderFactory
      maxDurationMs?: number
    } = {},
  ) {
    this._factory = options.factory ?? createOpusRecorderInstance
    this._maxDurationMs = options.maxDurationMs ?? MAX_RECORDING_DURATION_MS
  }

  /**
   * Set a callback invoked when auto-stop fires.
   * The callback receives the Ogg/Opus Blob.
   */
  onAutoStop(cb: ((blob: Blob) => void) | null): void {
    if (cb) {
      this._autoStopCallback = () => {
        this.stopRecording()
          .then((blob) => cb(blob))
          .catch(() => {
            /* swallow — recording already stopped */
          })
      }
    } else {
      this._autoStopCallback = null
    }
  }

  /**
   * Start voice recording.
   *  - Gates on microphone permission (surfaces MIC_PERMISSION_DENIED at attempt time)
   *  - Sets auto-stop timer at _maxDurationMs
   *
   * REQ-8.1, REQ-8.6
   */
  async startRecording(): Promise<void> {
    if (this._isRecording) {
      throw { type: 'RECORDING_ERROR', reason: 'Already recording' } as VoiceError
    }

    this._recorder = this._factory()
    // May throw { type: 'MIC_PERMISSION_DENIED' } — propagate to caller
    await this._recorder.start()

    this._isRecording = true

    // Auto-stop timer (REQ-8.2, REQ-8.3)
    this._autoStopTimer = setTimeout(() => {
      if (this._isRecording && this._autoStopCallback) {
        this._autoStopCallback()
      } else if (this._isRecording) {
        // No callback registered — stop silently
        this.stopRecording().catch(() => {})
      }
    }, this._maxDurationMs)
  }

  /**
   * Stop voice recording and return the Ogg/Opus Blob.
   * Clears the auto-stop timer.
   *
   * REQ-8.1
   */
  async stopRecording(): Promise<Blob> {
    if (!this._isRecording || !this._recorder) {
      throw { type: 'RECORDING_ERROR', reason: 'Not recording' } as VoiceError
    }

    this._isRecording = false

    if (this._autoStopTimer !== null) {
      clearTimeout(this._autoStopTimer)
      this._autoStopTimer = null
    }

    const blob = await this._recorder.stop()
    this._recorder = null
    return blob
  }

  /** Whether recording is currently active. */
  get isRecording(): boolean {
    return this._isRecording
  }
}
