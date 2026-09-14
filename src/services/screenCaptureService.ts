/**
 * Unified Screen Capture Service
 * Encapsulates the Web MediaDevices API to capture the user's entire desktop/screen.
 * Designed to act as a singleton to preserve state and stream persistence across all navigation paths.
 */

export interface ScreenCaptureServiceListener {
  onStart?: (stream: MediaStream) => void
  onStop?: () => void
  onError?: (error: Error) => void
}

class ScreenCaptureService {
  private activeStream: MediaStream | null = null
  private listeners: Set<ScreenCaptureServiceListener> = new Set()

  /**
   * Register a listener for stream lifecycle events
   */
  public registerListener(listener: ScreenCaptureServiceListener): () => void {
    this.listeners.add(listener)
    // If stream is already active, immediately notify the new listener
    if (this.activeStream && listener.onStart) {
      listener.onStart(this.activeStream)
    }
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Retrieves the active MediaStream instance if available
   */
  public getStream(): MediaStream | null {
    return this.activeStream
  }

  /**
   * Checks if an active capture session is running
   */
  public isActive(): boolean {
    return !!this.activeStream && this.activeStream.active
  }

  /**
   * Starts capturing the user's entire desktop screen.
   * Leverages the MediaDevices API, explicitly suggesting monitor (entire screen) display surface.
   */
  public async startCapture(): Promise<MediaStream> {
    if (this.isActive() && this.activeStream) {
      return this.activeStream
    }

    try {
      // Prompt for Display Media, prioritizing the ENTIRE desktop screen (monitor)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 } // Optimized for reading text & static screens while saving CPU/bandwidth
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      } as DisplayMediaStreamOptions)

      this.activeStream = stream

      // Set up onended callback to clean up automatically if the user clicks browser's native stop-sharing button
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopCapture()
        }
      }

      // Notify all registered listeners
      this.listeners.forEach((listener) => {
        if (listener.onStart) {
          listener.onStart(stream)
        }
      })

      return stream
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initiate screen capture.')
      this.listeners.forEach((listener) => {
        if (listener.onError) {
          listener.onError(error)
        }
      })
      throw error
    }
  }

  /**
   * Stops the active screen capture session and releases all hardware/system tracks
   */
  public stopCapture(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop()
        }
      })
      this.activeStream = null

      // Notify all registered listeners
      this.listeners.forEach((listener) => {
        if (listener.onStop) {
          listener.onStop()
        }
      })
    }
  }
}

export const screenCaptureService = new ScreenCaptureService()
