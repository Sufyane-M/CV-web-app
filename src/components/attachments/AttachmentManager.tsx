import React, { useCallback, useMemo, useRef, useState } from 'react';
import { UploadIcon } from '../shared/icons/UploadIcon';
import { TrashIcon } from '../shared/icons/TrashIcon';
import { attachmentService, UploadedFileInfo } from '../../services/attachmentService';

interface AttachmentManagerProps {
	userId: string;
	value: File | null;
	onChange: (file: File | null) => void;
	onUploaded?: (info: UploadedFileInfo) => void;
	onError?: (message: string) => void;
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({ userId, value, onChange, onUploaded, onError }) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadedInfo, setUploadedInfo] = useState<UploadedFileInfo | null>(null);

	const openFileDialog = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const handleError = useCallback((message: string) => {
		setError(message);
		onError?.(message);
	}, [onError]);

	const validateAndUpload = useCallback(async (file: File) => {
		setError(null);
		const validation = attachmentService.validatePdfFile(file);
		if (!validation.isValid) {
			return handleError(validation.error || 'File non valido');
		}
		setIsUploading(true);
		const { data, error } = await attachmentService.uploadCvFile(userId, file);
		setIsUploading(false);
		if (error || !data) return handleError(error || 'Errore durante il caricamento del file');
		setUploadedInfo(data);
		onUploaded?.(data);
		onChange(file);
	}, [handleError, onChange, onUploaded, userId]);

	const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
		if (!file) return handleError('Selezione non valida. Scegli un file PDF.');
		await validateAndUpload(file);
	}, [handleError, validateAndUpload]);

	const handleDrop = useCallback(async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		const dt = e.dataTransfer;
		const fileList = Array.from(dt.files || []);
		const file = fileList[0];
		if (!file) return handleError('Nessun file rilevato. Trascina un file PDF o clicca per selezionarlo.');
		await validateAndUpload(file);
		try {
			if (dt.items) dt.items.clear();
			dt.clearData();
		} catch {}
	}, [handleError, validateAndUpload]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
		} catch {}
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const removeFile = useCallback(() => {
		onChange(null);
		setUploadedInfo(null);
		setError(null);
		if (inputRef.current) inputRef.current.value = '';
	}, [onChange]);

	const fileSizeLabel = useMemo(() => {
		if (!value) return '';
		const mb = (value.size / 1024 / 1024).toFixed(2);
		return `${mb} MB`;
	}, [value]);

	return (
		<div className="relative p-6 bg-white/5 dark:bg-gray-800/30 rounded-3xl border border-gray-200/20 dark:border-gray-700/30 backdrop-blur-sm shadow-lg">
			<input
				ref={inputRef}
				type="file"
				onChange={handleFileSelect}
				accept=".pdf,application/pdf"
				className="hidden"
				aria-label="Carica CV in PDF"
			/>

			{!value ? (
				<div
					onClick={openFileDialog}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragEnter={handleDragOver}
					onDragLeave={handleDragLeave}
					role="button"
					tabIndex={0}
					className={`group relative w-full p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 ease-out transform hover:scale-[1.02] ${
						isDragging 
							? 'border-blue-400 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-blue-600/20 shadow-2xl shadow-blue-500/25 scale-[1.02]' 
							: 'border-slate-500/60 hover:border-blue-400/80 hover:bg-gradient-to-br hover:from-slate-700/40 hover:via-slate-600/20 hover:to-blue-900/20 hover:shadow-xl hover:shadow-slate-900/50'
					} backdrop-blur-sm`}
				>
					{/* Animated background gradient */}
					<div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
						isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
					} bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-blue-500/10`} />
					
					{/* Floating particles effect */}
					<div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
						<div className={`absolute top-4 left-4 w-2 h-2 bg-blue-400/40 rounded-full transition-all duration-700 ${
							isDragging ? 'animate-bounce' : 'group-hover:animate-pulse'
						}`} />
						<div className={`absolute top-8 right-6 w-1 h-1 bg-purple-400/40 rounded-full transition-all duration-500 delay-100 ${
							isDragging ? 'animate-ping' : 'group-hover:animate-pulse'
						}`} />
						<div className={`absolute bottom-6 left-8 w-1.5 h-1.5 bg-blue-300/30 rounded-full transition-all duration-600 delay-200 ${
							isDragging ? 'animate-bounce' : 'group-hover:animate-pulse'
						}`} />
					</div>

					<div className="relative flex flex-col items-center justify-center space-y-5 text-slate-400">
						<div className={`relative transition-all duration-500 ${
							isDragging ? 'scale-110 rotate-6' : 'group-hover:scale-105 group-hover:-rotate-2'
						}`}>
							<UploadIcon className={`w-16 h-16 transition-all duration-500 ${
								isDragging ? 'text-blue-400 drop-shadow-lg' : 'text-slate-400 group-hover:text-blue-400'
							}`} />
							{/* Glow effect */}
							<div className={`absolute inset-0 w-16 h-16 transition-all duration-500 ${
								isDragging ? 'bg-blue-400/20 blur-xl scale-150' : 'group-hover:bg-blue-400/10 group-hover:blur-lg group-hover:scale-125'
							} rounded-full`} />
						</div>
						
						<div className="text-center space-y-3">
							<p className={`text-xl font-bold transition-all duration-300 ${
								isDragging ? 'text-blue-300 scale-105' : 'text-slate-200 group-hover:text-blue-300'
							}`}>Trascina qui il tuo CV in PDF</p>
							
							<div className="flex items-center gap-3">
								<div className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent flex-1" />
								<span className={`text-sm font-medium transition-colors duration-300 ${
									isDragging ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-300'
								}`}>oppure</span>
								<div className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent flex-1" />
							</div>
							
							<div className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
								isDragging 
									? 'bg-blue-500/30 text-blue-200 shadow-lg shadow-blue-500/25 scale-105' 
									: 'bg-blue-500/20 text-blue-300 group-hover:bg-blue-500/30 group-hover:text-blue-200 group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:scale-105'
							} backdrop-blur-sm border border-blue-400/30`}>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
								</svg>
								Seleziona un file dal computer
							</div>
						</div>
						
						{isUploading && (
							<div className="flex items-center gap-3 px-4 py-2 bg-blue-500/20 rounded-lg border border-blue-400/30 backdrop-blur-sm">
								<div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
								<p className="text-sm text-blue-300 font-medium">Caricamento in corso...</p>
							</div>
						)}
						
						{error && (
							<div className="flex items-center gap-3 px-4 py-2 bg-red-500/20 rounded-lg border border-red-400/30 backdrop-blur-sm animate-pulse">
								<svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p className="text-sm text-red-300 font-medium">{error}</p>
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="group relative w-full p-8 border border-slate-500/40 bg-gradient-to-br from-slate-700/60 via-slate-600/40 to-slate-700/60 rounded-2xl flex items-center justify-between backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-slate-400/60">
					{/* Success indicator */}
					<div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
						<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
						</svg>
					</div>

					<div className="flex items-center gap-6">
						<div className="relative">
							<div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm" />
							<div className="relative p-4 bg-gradient-to-br from-slate-600/80 to-slate-700/80 rounded-xl border border-slate-500/50">
								<FileIcon />
							</div>
						</div>
						
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-3 mb-2">
								<p className="text-slate-100 text-base font-semibold truncate max-w-[280px]" title={value.name}>
									{value.name}
								</p>
								<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
									Caricato
								</span>
							</div>
							
							<div className="flex items-center gap-5 text-xs">
								<div className="flex items-center gap-1 text-slate-400">
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
									</svg>
									<span className="font-medium">{fileSizeLabel}</span>
								</div>
								
								{uploadedInfo?.signedUrl && (
									<a 
										href={uploadedInfo.signedUrl} 
										target="_blank" 
										rel="noreferrer" 
										className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium hover:underline"
									>
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
										Anteprima (1h)
									</a>
								)}
							</div>
						</div>
					</div>
					
					<button
						onClick={removeFile}
						className="group/btn relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-300 hover:text-red-200 transition-all duration-300 hover:scale-105 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400/50 backdrop-blur-sm hover:shadow-lg hover:shadow-red-500/25"
					>
						<TrashIcon className="w-4 h-4 transition-transform duration-200 group-hover/btn:scale-110" />
						<span className="font-medium">Rimuovi</span>
						
						{/* Hover glow effect */}
						<div className="absolute inset-0 rounded-xl bg-red-400/0 group-hover/btn:bg-red-400/5 transition-all duration-300" />
					</button>
				</div>
			)}
		</div>
	);
};

const FileIcon: React.FC = () => (
	<div className="relative">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-10 h-10">
			{/* Main document body with gradient */}
			<defs>
				<linearGradient id="docGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
					<stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
					<stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
				</linearGradient>
				<linearGradient id="foldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
					<stop offset="100%" stopColor="#334155" stopOpacity="0.6" />
				</linearGradient>
			</defs>
			
			{/* Document shadow */}
			<path 
				d="M14.5 2.5H6.5a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8.5l-6-6z" 
				fill="#0f172a" 
				opacity="0.3"
			/>
			
			{/* Main document body */}
			<path 
				d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" 
				fill="url(#docGradient)"
				stroke="#475569" 
				strokeWidth="0.5"
			/>
			
			{/* Folded corner */}
			<path 
				d="M14 2v6h6" 
				fill="url(#foldGradient)"
				stroke="#475569" 
				strokeWidth="0.5"
			/>
			
			{/* PDF text indicator */}
			<text 
				x="12" 
				y="16" 
				textAnchor="middle" 
				fill="#e2e8f0" 
				fontSize="3" 
				fontWeight="bold" 
				fontFamily="system-ui"
			>
				PDF
			</text>
			
			{/* Decorative lines */}
			<line x1="7" y1="11" x2="17" y2="11" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.6" />
			<line x1="7" y1="13" x2="15" y2="13" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.4" />
			<line x1="7" y1="18" x2="16" y2="18" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.3" />
		</svg>
		
		{/* Subtle glow effect */}
		<div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-lg blur-sm" />
	</div>
);

export default AttachmentManager;


