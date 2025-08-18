import { getSupabase } from './supabase';

export interface UploadedFileInfo {
	filePath: string;
	publicUrl?: string | null;
	signedUrl?: string | null;
}

class AttachmentService {
	private readonly maxSizeBytes = 10 * 1024 * 1024; // 10MB

	validatePdfFile(file: File): { isValid: boolean; error?: string } {
		if (!file) {
			return { isValid: false, error: 'Nessun file selezionato' };
		}
		if (file.size === 0) {
			return { isValid: false, error: 'Il file è vuoto o non accessibile' };
		}
		if (file.size > this.maxSizeBytes) {
			return { isValid: false, error: 'Il file non può superare i 10MB' };
		}

		const fileName = file.name.toLowerCase();
		const isPdfByExtension = fileName.endsWith('.pdf');
		const allowedMimeTypes = new Set([
			'application/pdf',
			'application/x-pdf',
			'application/acrobat',
			'applications/pdf',
			'bytes',
			'application/octet-stream',
		]);
		const hasAllowedMime = file.type && allowedMimeTypes.has(file.type);

		if (!isPdfByExtension && !hasAllowedMime) {
			return { isValid: false, error: 'Il file deve essere in formato PDF (.pdf)' };
		}

		return { isValid: true };
	}

	sanitizeFileName(originalName: string): string {
		const name = originalName.normalize('NFKD').replace(/[^\w.\-]+/g, '_');
		// Ensure it ends with .pdf
		if (!name.toLowerCase().endsWith('.pdf')) {
			return `${name}.pdf`;
		}
		return name;
	}

	generateStoragePath(userId: string, fileName: string): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeName = this.sanitizeFileName(fileName);
		return `${userId}/${timestamp}-${safeName}`;
	}

	async uploadCvFile(userId: string, file: File): Promise<{ data?: UploadedFileInfo; error?: string }> {
		const validation = this.validatePdfFile(file);
		if (!validation.isValid) {
			return { error: validation.error || 'File non valido' };
		}

		const path = this.generateStoragePath(userId, file.name);
		try {
			const { data: uploadRes, error: uploadErr } = await getSupabase()
				.storage
				.from('cv-files')
				.upload(path, file, {
					cacheControl: '3600',
					upsert: false,
					contentType: 'application/pdf',
				});
			if (uploadErr) {
				return { error: uploadErr.message || 'Errore durante il caricamento del file' };
			}

			// Prefer a short-lived signed URL over public
			let signedUrl: string | null = null;
			try {
				const { data: signed } = await getSupabase()
					.storage
					.from('cv-files')
					.createSignedUrl(uploadRes.path, 60 * 60); // 1h
				signedUrl = signed?.signedUrl || null;
			} catch {}

			// Also compute public URL in case bucket is public
			const { data: pub } = getSupabase().storage.from('cv-files').getPublicUrl(uploadRes.path);
			const publicUrl = pub?.publicUrl || null;

			return { data: { filePath: uploadRes.path, publicUrl, signedUrl } };
		} catch (e: any) {
			return { error: e?.message || 'Errore sconosciuto durante l\'upload' };
		}
	}

	async deleteCvFile(filePath: string): Promise<{ success: boolean; error?: string }> {
		try {
			const { error } = await getSupabase().storage.from('cv-files').remove([filePath]);
			if (error) return { success: false, error: error.message };
			return { success: true };
		} catch (e: any) {
			return { success: false, error: e?.message || 'Errore nella cancellazione del file' };
		}
	}
}

export const attachmentService = new AttachmentService();


