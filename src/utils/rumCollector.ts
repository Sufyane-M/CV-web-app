interface RUMData {
  sessionId: string;
  userId?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  metrics: {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  };
  customMetrics: {
    analysisStartTime?: number;
    analysisCompleteTime?: number;
    fileUploadTime?: number;
    apiResponseTime?: number;
    endpoint?: string;
  };
}

class RUMCollector {
  private sessionId: string;
  private buffer: RUMData[] = [];
  private flushInterval: number = 30000; // 30 secondi
  private maxBufferSize: number = 50;
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
    this.setupBeforeUnloadHandler();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  collect(data: Partial<RUMData>) {
    const rumData: RUMData = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      deviceType: this.getDeviceType(),
      metrics: {},
      customMetrics: {},
      ...data
    };

    this.buffer.push(rumData);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    return connection ? connection.effectiveType || 'unknown' : 'unknown';
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const data = [...this.buffer];
    this.buffer = [];

    try {
      // Use the API base URL from environment; if not set, skip sending in production
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
      if (!apiBaseUrl) {
        return;
      }

      await fetch(`${apiBaseUrl}/rum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics: data }),
        keepalive: true,
      });
      
      if (import.meta.env.DEV) {
        console.log(`📊 Sent ${data.length} RUM metrics`);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to send RUM data:', error);
      }
      // Re-add to buffer for retry (max 3 retries)
      if (data.length < 150) { // Avoid infinite growth
        this.buffer.unshift(...data);
      }
    }
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (this.buffer.length > 0) {
        // Use sendBeacon for reliable delivery
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
          if (apiBaseUrl) {
            navigator.sendBeacon(
              `${apiBaseUrl}/rum`,
              JSON.stringify({ metrics: this.buffer })
            );
          }
        } catch {}
      }
    });
  }

  // Metodi per metriche custom
  trackAnalysisStart() {
    this.collect({
      customMetrics: {
        analysisStartTime: performance.now()
      }
    });
  }

  trackAnalysisComplete(startTime: number) {
    this.collect({
      customMetrics: {
        analysisCompleteTime: performance.now() - startTime
      }
    });
  }

  trackFileUpload(uploadTime: number) {
    this.collect({
      customMetrics: {
        fileUploadTime: uploadTime
      }
    });
  }

  trackAPIResponse(responseTime: number, endpoint: string) {
    this.collect({
      customMetrics: {
        apiResponseTime: responseTime,
        endpoint
      }
    });
  }

  // Metodi per Web Vitals
  trackWebVital(name: string, value: number) {
    this.collect({
      metrics: {
        [name.toLowerCase()]: value
      }
    });
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

export const rumCollector = new RUMCollector();
export default rumCollector;
export type { RUMData };