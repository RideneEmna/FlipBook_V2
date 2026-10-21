export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_CONVERTER_URL) {
    return process.env.NEXT_PUBLIC_CONVERTER_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
}

export const BASE = getBaseUrl();

// Doit rester égal à MAX_UPLOAD_MB côté Python (500 par défaut).
export const MAX_UPLOAD_MB = 500;


export type ConvertedPage = {
    pageNumber: number;
    imagePath: string;
    thumbPath: string;
    title: string;
};

export type JobStatus = 'queued' | 'running' | 'completed' | 'error';

export type JobSnapshot = {
    jobId: string;
    status: JobStatus;
    percent: number;
    step: string;
    message: string;
    totalPages: number;
    error: string | null;
    pages?: ConvertedPage[]; // présent seulement quand status === 'completed'
};

async function readError(res: Response): Promise<string> {
    try {
        const data = await res.json();
        if (typeof data?.detail === 'string') return data.detail;
        if (Array.isArray(data?.detail)) return 'Paramètres de conversion invalides';
    } catch {
        // réponse sans JSON : on retombe sur le code HTTP
    }
    return `Erreur ${res.status}`;
}

export async function uploadPDF(
    file: File,
    opts: { dpi: number; quality: number }
): Promise<{ jobId: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('dpi', String(opts.dpi));
    form.append('quality', String(opts.quality));

    let res: Response;
    try {
        res = await fetch(`${BASE}/convert`, { method: 'POST', body: form });
    } catch {
        throw new Error(
            `Impossible de joindre le convertisseur (${BASE}). Vérifiez qu'il est démarré.`
        );
    }
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()) as { jobId: string };
}

// Suit la progression en Server-Sent Events. Retourne une fonction qui ferme le flux.
export function watchJobProgress(
    jobId: string,
    onUpdate: (snapshot: JobSnapshot) => void,
    onConnectionLost: () => void
): () => void {
    let closedDeliberately = false;
    const base = getBaseUrl();
    const source = new EventSource(`${base}/jobs/${jobId}/stream`);

    source.onmessage = (event) => {
        try {
            const snapshot = JSON.parse(event.data) as JobSnapshot;
            if (snapshot.status === 'completed' || snapshot.status === 'error') {
                closedDeliberately = true;
                source.close();
            }
            onUpdate(snapshot);
        } catch (e) {
            console.error('Error parsing SSE snapshot:', e);
        }
    };

    source.onerror = () => {
        if (closedDeliberately) return;
        // CONNECTING = le navigateur réessaie seul ; CLOSED = abandon (job expiré, service arrêté)
        if (source.readyState === EventSource.CLOSED) {
            onConnectionLost();
        }
    };

    return () => {
        closedDeliberately = true;
        source.close();
    };
}

// Base des fichiers d'un job : à passer au lecteur comme assetBase.
export const assetBase = (jobId: string) => `${BASE}/files/${jobId}/`;

// 404 = les fichiers ont expiré (section 11 du plan).
export async function jobExists(jobId: string): Promise<boolean> {
    try {
        const res = await fetch(`${BASE}/jobs/${jobId}`);
        return res.ok;
    } catch {
        return false;
    }
}
