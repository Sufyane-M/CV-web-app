/**
 * Utility per ottimizzare il preload delle risorse CSS e JS
 * Risolve i warning sui CSS preload non utilizzati
 */

interface PreloadResource {
  href: string;
  as: 'style' | 'script' | 'font';
  type?: string;
  crossorigin?: string;
}

class PreloadOptimizer {
  private preloadedResources = new Set<string>();
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.initializeObserver();
  }

  private initializeObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const href = element.dataset.preloadHref;
            const as = element.dataset.preloadAs as 'style' | 'script' | 'font';
            
            if (href && as) {
              this.preloadResource({ href, as });
              this.observer?.unobserve(element);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  }

  /**
   * Preload una risorsa solo quando necessario
   */
  preloadResource(resource: PreloadResource) {
    if (this.preloadedResources.has(resource.href)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    
    if (resource.type) {
      link.type = resource.type;
    }
    
    if (resource.crossorigin) {
      link.crossOrigin = resource.crossorigin;
    }

    // Aggiungi listener per rimuovere il preload quando la risorsa è caricata
    link.onload = () => {
      // Rimuovi il link preload dopo il caricamento per evitare warning
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 1000);
    };

    link.onerror = () => {
      console.warn(`Failed to preload resource: ${resource.href}`);
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };

    document.head.appendChild(link);
    this.preloadedResources.add(resource.href);
  }

  /**
   * Preload CSS critico immediatamente
   */
  preloadCriticalCSS(href: string) {
    this.preloadResource({ href, as: 'style' });
  }

  /**
   * Preload CSS non critico con delay
   */
  preloadNonCriticalCSS(href: string, delay = 100) {
    setTimeout(() => {
      this.preloadResource({ href, as: 'style' });
    }, delay);
  }

  /**
   * Osserva un elemento per preload lazy
   */
  observeForPreload(element: HTMLElement, resource: PreloadResource) {
    if (!this.observer) return;

    element.dataset.preloadHref = resource.href;
    element.dataset.preloadAs = resource.as;
    this.observer.observe(element);
  }

  /**
   * Pulisce le risorse e gli observer
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.preloadedResources.clear();
  }
}

export const preloadOptimizer = new PreloadOptimizer();
export default preloadOptimizer;