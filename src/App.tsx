import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Files, 
  Unlock, 
  ArrowRight, 
  Move, 
  Image as ImageIcon, 
  ArrowLeft,
  UploadCloud,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

// --- DEFINICIONES DE LIBRERÍAS EXTERNAS (Cargadas vía CDN) ---
declare global {
  interface Window {
    PDFLib: any;
    pdfjsLib: any;
  }
}

// --- COMPONENTES UI REUTILIZABLES ---

const Card = ({ title, description, icon, onClick, color = "indigo" }: any) => (
  <button 
    onClick={onClick}
    className="group flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 transform hover:-translate-y-1"
  >
    <div className={`mb-6 p-4 rounded-full bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </button>
);

const Button = ({ children, onClick, disabled, loading, variant = 'primary', className = '' }: any) => {
  const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
};

type FileInputProps = {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
};

const FileInput = ({ onFilesSelected, multiple = false, accept = ".pdf", label = "Seleccionar archivos" }: FileInputProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const emitFiles = (filesLike: FileList | File[]) => {
    const pickedFiles = Array.from(filesLike);
    if (!pickedFiles.length) return;
    onFilesSelected(multiple ? pickedFiles : [pickedFiles[0]]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) emitFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    emitFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragActive(false);
  };

  return (
    <div className="w-full">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
          isDragActive
            ? "border-indigo-400 bg-indigo-100 shadow-inner"
            : "border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-300"
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className={`w-10 h-10 mb-2 ${isDragActive ? "text-indigo-600" : "text-indigo-400"}`} />
          <p className="mb-1 text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-xs text-gray-400">
            {multiple ? "Selecciona varios o arrastralos aqui" : "Selecciona uno o arrastralo aqui"}
          </p>
        </div>
        <input type="file" className="hidden" onChange={handleInputChange} multiple={multiple} accept={accept} />
      </label>
    </div>
  );
};

// --- COMPONENTES DE HERRAMIENTAS ---

// 1. FUSIONAR PDF
const MergeTool = ({ pdfLib, showToast }: any) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const moveFile = (idx: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    if (direction === 'up' && idx > 0) {
      [newFiles[idx], newFiles[idx - 1]] = [newFiles[idx - 1], newFiles[idx]];
    } else if (direction === 'down' && idx < newFiles.length - 1) {
      [newFiles[idx], newFiles[idx + 1]] = [newFiles[idx + 1], newFiles[idx]];
    }
    setFiles(newFiles);
  };

  const merge = async () => {
    if (files.length < 2) return showToast("Selecciona al menos 2 PDFs", "error");
    setProcessing(true);
    try {
      const mergedPdf = await pdfLib.PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await pdfLib.PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      downloadBlob(pdfBytes, "fusionado.pdf", "application/pdf");
      showToast("¡Fusión completada con éxito!", "success");
      setFiles([]);
    } catch (error) {
      console.error(error);
      showToast("Error al fusionar archivos", "error");
    }
    setProcessing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Fusionar PDFs</h2>
        <p className="text-gray-500 mt-2">Une múltiples documentos en un solo archivo ordenado.</p>
      </div>

      <FileInput onFilesSelected={handleFilesSelected} multiple={true} label="Añadir archivos PDF" />

      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <Files className="w-4 h-4" /> Archivos ({files.length})
            </h4>
            <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Limpiar todo</button>
          </div>
          <ul className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto custom-scrollbar">
            {files.map((f, i) => (
              <li key={i} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="bg-indigo-100 text-indigo-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">{f.name}</span>
                    <span className="text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveFile(i, 'up')} disabled={i === 0} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30 transition-colors" title="Subir"><ArrowLeft className="w-4 h-4 rotate-90" /></button>
                  <button onClick={() => moveFile(i, 'down')} disabled={i === files.length - 1} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30 transition-colors" title="Bajar"><ArrowLeft className="w-4 h-4 -rotate-90" /></button>
                  <button onClick={() => removeFile(i)} className="p-1.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded ml-2 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={merge} loading={processing} disabled={files.length < 2} className="w-full py-4 text-lg shadow-xl shadow-indigo-200">
        {processing ? "Procesando..." : "Fusionar Archivos"}
      </Button>
    </div>
  );
};

// 2. EXTRAER PÁGINAS
const ExtractTool = ({ pdfLib, showToast }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [pagesStr, setPagesStr] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleFileSelected = (selectedFiles: File[]) => {
    setFile(selectedFiles[0] ?? null);
  };

  const extract = async () => {
    if (!file || !pagesStr) return showToast("Faltan datos", "error");
    setProcessing(true);
    try {
      const srcPdf = await pdfLib.PDFDocument.load(await file.arrayBuffer());
      const newPdf = await pdfLib.PDFDocument.create();
      
      const indices: number[] = [];
      const totalPages = srcPdf.getPageCount();

      pagesStr.split(',').forEach(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) indices.push(i - 1);
          }
        } else {
          const page = parseInt(part.trim());
          if (!isNaN(page)) indices.push(page - 1);
        }
      });

      const validIndices = [...new Set(indices)].filter(i => i >= 0 && i < totalPages);
      if (validIndices.length === 0) throw new Error("Páginas inválidas");

      const copiedPages = await newPdf.copyPages(srcPdf, validIndices);
      copiedPages.forEach((page: any) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      downloadBlob(pdfBytes, `extraido_${file.name}`, "application/pdf");
      showToast("Páginas extraídas correctamente", "success");
    } catch (e) {
      showToast("Error: Revisa los números de página", "error");
    }
    setProcessing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Extraer Páginas</h2>
        <p className="text-gray-500 mt-2">Crea un nuevo PDF con solo las páginas que necesitas.</p>
      </div>

      <FileInput onFilesSelected={handleFileSelected} label="Elige el PDF origen" />

      {file && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-3 text-indigo-600 font-medium">
            <FileText className="w-5 h-5" />
            {file.name}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Páginas a extraer</label>
            <input 
              type="text" 
              placeholder="Ej: 1, 3-5, 8"
              value={pagesStr}
              onChange={(e) => setPagesStr(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            <p className="text-xs text-gray-400 mt-2">Usa comas para separar y guiones para rangos (Ej. 1-3 extrae páginas 1, 2 y 3).</p>
          </div>
        </div>
      )}

      <Button onClick={extract} loading={processing} disabled={!file || !pagesStr} className="w-full py-4 text-lg">
        {processing ? "Extrayendo..." : "Descargar PDF Extraído"}
      </Button>
    </div>
  );
};

// 3. ELIMINAR CONTRASEÑA (FIXED)
const UnlockTool = ({ pdfLib, pdfjs, showToast }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleFileSelected = (selectedFiles: File[]) => {
    setFile(selectedFiles[0] ?? null);
  };

  const canvasToJpgBytes = async (canvas: HTMLCanvasElement): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("No se pudo convertir la página a imagen"));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      }, "image/jpeg", 0.92);
    });
  };

  const validateUnlockedPdf = async (candidateBytes: Uint8Array) => {
    const validationTask = pdfjs.getDocument({ data: candidateBytes });
    const validationPdf = await validationTask.promise;
    try {
      if (validationPdf.numPages > 0) {
        await validationPdf.getPage(1);
      }
    } finally {
      await validationPdf.destroy();
    }
  };

  const rebuildUnlockedPdfFromRender = async (sourcePdf: any) => {
    const rebuiltPdf = await pdfLib.PDFDocument.create();
    const renderScale = 1.6;

    for (let pageIndex = 1; pageIndex <= sourcePdf.numPages; pageIndex++) {
      const page = await sourcePdf.getPage(pageIndex);
      const outputViewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No se pudo crear el canvas para renderizar");

      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      const imgBytes = await canvasToJpgBytes(canvas);
      const img = await rebuiltPdf.embedJpg(imgBytes);
      const outPage = rebuiltPdf.addPage([outputViewport.width, outputViewport.height]);
      outPage.drawImage(img, {
        x: 0,
        y: 0,
        width: outputViewport.width,
        height: outputViewport.height
      });

      canvas.width = 0;
      canvas.height = 0;
      if (typeof page.cleanup === "function") page.cleanup();
    }

    return rebuiltPdf.save();
  };

  const unlock = async () => {
    if (!file || !password) return showToast("Por favor ingresa el archivo y la contraseña", "error");
    setProcessing(true);
    let sourcePdf: any = null;

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());

      // Validar primero la contraseña con PDF.js.
      const sourceTask = pdfjs.getDocument({ data: sourceBytes, password });
      sourcePdf = await sourceTask.promise;

      let unlockedBytes: Uint8Array | null = null;

      try {
        // Ruta rápida: intentar remover encriptación directamente.
        const candidatePdf = await pdfLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
        const candidateBytes = await candidatePdf.save();
        await validateUnlockedPdf(candidateBytes);
        unlockedBytes = candidateBytes;
      } catch (fastPathError) {
        console.warn("Ruta directa de desbloqueo falló. Se usará reconstrucción por render.", fastPathError);
      }

      if (!unlockedBytes) {
        // Fallback robusto: reconstruir página por página sin protección.
        unlockedBytes = await rebuildUnlockedPdfFromRender(sourcePdf);
      }

      if (!unlockedBytes) {
        throw new Error("No se pudo generar un PDF desbloqueado");
      }

      downloadBlob(unlockedBytes, `desbloqueado_${file.name}`, "application/pdf");
      showToast("PDF desbloqueado correctamente", "success");
      setPassword("");
    } catch (e: any) {
      console.error("Error detallado:", e);
      const msg = (e?.message || "").toLowerCase();
      if (e?.name === "PasswordException" || msg.includes("password")) {
        showToast("Contraseña incorrecta. Inténtalo de nuevo.", "error");
      } else {
        showToast("No se pudo desbloquear el PDF. Verifica el archivo e inténtalo de nuevo.", "error");
      }
    } finally {
      if (sourcePdf && typeof sourcePdf.destroy === "function") {
        await sourcePdf.destroy();
      }
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Desbloquear PDF</h2>
        <p className="text-gray-500 mt-2">Elimina la protección de contraseña de tus archivos.</p>
      </div>

      {!file && <FileInput onFilesSelected={handleFileSelected} label="Subir PDF Protegido" />}

      {file && (
        <div className="space-y-4">
          {/* Confirmación Visual del Archivo */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <Lock className="w-5 h-5" />
               </div>
               <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
               </div>
            </div>
            <button onClick={() => { setFile(null); setPassword(""); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors">
               <X className="w-5 h-5" />
            </button>
          </div>

          {/* Input de Contraseña */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña del documento</label>
            <div className="relative">
              <Unlock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Ingresa la contraseña para desbloquear"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" /> Soporta encriptación estándar AES 128/256-bit
            </p>
          </div>
        </div>
      )}

      <Button onClick={unlock} loading={processing} disabled={!file || !password} variant="primary" className="w-full py-4 text-lg bg-rose-600 hover:bg-rose-700 shadow-rose-200">
        {processing ? "Desbloqueando..." : "Eliminar Restricción"}
      </Button>
    </div>
  );
};

// 4. ORDENAR PÁGINAS
const SortTool = ({ pdfLib, pdfjs, showToast, openPreview }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const renderThumbnails = async (f: File) => {
    setProcessing(true);
    setThumbnails([]);
    try {
      const buffer = await f.arrayBuffer();
      const loadingTask = pdfjs.getDocument(new Uint8Array(buffer).slice(0));
      const pdf = await loadingTask.promise;
      
      const newThumbs = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        newThumbs.push({
          id: i,
          originalIndex: i - 1,
          dataUrl: canvas.toDataURL()
        });
      }
      setThumbnails(newThumbs);
    } catch (e) {
      console.error(e);
      showToast("Error al leer el PDF", "error");
    }
    setProcessing(false);
  };

  const handleFileSelected = (selectedFiles: File[]) => {
    const f = selectedFiles[0];
    if (f) {
      setFile(f);
      renderThumbnails(f);
    }
  };

  const onDragStart = (e: any, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: any, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    const newItems = [...thumbnails];
    const dragged = newItems[draggedItem];
    newItems.splice(draggedItem, 1);
    newItems.splice(index, 0, dragged);
    
    setDraggedItem(index);
    setThumbnails(newItems);
  };

  const onDragEnd = () => {
    setDraggedItem(null);
  };

  const saveSorted = async () => {
    if (!file || thumbnails.length === 0) return;
    setProcessing(true);
    try {
      const srcPdf = await pdfLib.PDFDocument.load(await file.arrayBuffer());
      const newPdf = await pdfLib.PDFDocument.create();
      const indices = thumbnails.map(t => t.originalIndex);
      
      const copiedPages = await newPdf.copyPages(srcPdf, indices);
      copiedPages.forEach((p: any) => newPdf.addPage(p));
      
      const outBytes = await newPdf.save();
      downloadBlob(outBytes, `ordenado_${file.name}`, "application/pdf");
      showToast("PDF reordenado guardado", "success");
    } catch (e) {
      showToast("Error al guardar", "error");
    }
    setProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Ordenar Páginas</h2>
        <p className="text-gray-500 mt-2">Arrastra y suelta para cambiar el orden. Clic para ampliar.</p>
      </div>

      {!file && <FileInput onFilesSelected={handleFileSelected} label="Cargar PDF para ordenar" />}

      {file && thumbnails.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-200 min-h-[300px]">
            {thumbnails.map((thumb, index) => (
              <div 
                key={thumb.id}
                draggable
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={`relative group bg-white p-2 rounded-lg shadow-sm border-2 cursor-move transition-all ${draggedItem === index ? 'opacity-50 border-indigo-400 scale-95' : 'border-transparent hover:border-indigo-200 hover:shadow-md'}`}
              >
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded z-10 font-mono">
                  {index + 1}
                </div>
                <button 
                  onClick={() => openPreview(thumb.dataUrl)}
                  className="absolute bottom-2 right-2 bg-white/90 p-1 rounded-full text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <img src={thumb.dataUrl} alt={`Pagina ${index + 1}`} className="w-full h-auto rounded border border-gray-100 pointer-events-none select-none" />
              </div>
            ))}
          </div>

          <div className="flex gap-4">
             <Button onClick={() => { setFile(null); setThumbnails([]); }} variant="secondary" className="flex-1">
                Cancelar
             </Button>
             <Button onClick={saveSorted} loading={processing} className="flex-1">
                {processing ? "Guardando..." : "Guardar Nuevo Orden"}
             </Button>
          </div>
        </div>
      )}
      {processing && !thumbnails.length && (
         <div className="text-center py-10"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto"/> <p className="mt-2 text-gray-500">Generando vistas previas...</p></div>
      )}
    </div>
  );
};

// 5. IMÁGENES A PDF (Ahora con Previsualización y Zoom)
const ImagesToPdfTool = ({ pdfLib, showToast, openPreview }: any) => {
  const [files, setFiles] = useState<File[]>([]); 
  const [processing, setProcessing] = useState(false);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const moveFile = (idx: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    if (direction === 'up' && idx > 0) {
      [newFiles[idx], newFiles[idx - 1]] = [newFiles[idx - 1], newFiles[idx]];
    } else if (direction === 'down' && idx < newFiles.length - 1) {
      [newFiles[idx], newFiles[idx + 1]] = [newFiles[idx + 1], newFiles[idx]];
    }
    setFiles(newFiles);
  };

  // Helper para crear preview (usando blob)
  const handlePreview = (file: File) => {
    const url = URL.createObjectURL(file);
    openPreview(url);
  };

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const pdf = await pdfLib.PDFDocument.create();
      
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        let img;
        if (file.type === 'image/png') {
          img = await pdf.embedPng(bytes);
        } else {
          img = await pdf.embedJpg(bytes);
        }
        
        const page = pdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      
      const pdfBytes = await pdf.save();
      downloadBlob(pdfBytes, "imagenes_convertidas.pdf", "application/pdf");
      showToast("PDF creado correctamente", "success");
    } catch (e) {
      showToast("Error: Asegúrate de usar PNG o JPG válidos", "error");
    }
    setProcessing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Imágenes a PDF</h2>
        <p className="text-gray-500 mt-2">Convierte fotos o escaneos en un documento PDF único.</p>
      </div>

      <FileInput onFilesSelected={handleFilesSelected} multiple={true} accept="image/png, image/jpeg, image/jpg" label="Añadir Imágenes (JPG, PNG)" />

      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h4 className="font-semibold text-gray-700">Imágenes ({files.length})</h4>
            <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Limpiar todo</button>
          </div>
          <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto custom-scrollbar">
            {files.map((f, i) => (
              <li key={i} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <span className="bg-indigo-100 text-indigo-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">{i + 1}</span>
                  {/* Miniatura clickable */}
                  <div 
                    className="h-12 w-12 rounded bg-gray-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-400 flex-shrink-0 relative group"
                    onClick={() => handlePreview(f)}
                  >
                     <img 
                        src={URL.createObjectURL(f)} 
                        alt="thumb" 
                        className="w-full h-full object-cover" 
                        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} // Liberar memoria
                     />
                     <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4 text-white" />
                     </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-gray-700 font-medium truncate">{f.name}</span>
                    <span className="text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                   <button onClick={() => handlePreview(f)} className="p-1.5 hover:bg-indigo-50 text-indigo-500 rounded transition-colors" title="Ver Grande"><Maximize2 className="w-4 h-4" /></button>
                   <div className="w-px h-4 bg-gray-300 mx-1"></div>
                   <button onClick={() => moveFile(i, 'up')} disabled={i === 0} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30 transition-colors"><ArrowLeft className="w-4 h-4 rotate-90" /></button>
                   <button onClick={() => moveFile(i, 'down')} disabled={i === files.length - 1} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30 transition-colors"><ArrowLeft className="w-4 h-4 -rotate-90" /></button>
                   <button onClick={() => removeFile(i)} className="p-1.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded ml-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={convert} loading={processing} disabled={files.length === 0} className="w-full py-4 text-lg">
        {processing ? "Convirtiendo..." : "Generar PDF"}
      </Button>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [view, setView] = useState('home');
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Cargar librerías CDN (Versiones UMD estables)
  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    };

    Promise.all([
      // PDF-LIB (UMD)
      loadScript('https://unpkg.com/pdf-lib/dist/pdf-lib.min.js'),
      // PDF.JS (UMD - cdnjs)
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
    ]).then(() => {
      // Configurar worker de PDF.js
      // @ts-ignore
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        setLibsLoaded(true);
      } else {
        console.error("PDF.js loaded but window.pdfjsLib is undefined");
      }
    }).catch(e => console.error("Error loading libs", e));
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(0.25, Math.min(3, prev + delta)));
  };

  const renderView = () => {
    if (!libsLoaded) return <div className="h-screen flex flex-col items-center justify-center text-indigo-600"><Loader2 className="w-12 h-12 animate-spin mb-4" /><p>Cargando herramientas PDF...</p></div>;

    const commonProps = { 
      pdfLib: window.PDFLib, 
      pdfjs: window.pdfjsLib, 
      showToast,
      openPreview: (url: string) => { setPreviewImg(url); setZoomLevel(1); }
    };

    switch (view) {
      case 'merge': return <MergeTool {...commonProps} />;
      case 'extract': return <ExtractTool {...commonProps} />;
      case 'unlock': return <UnlockTool {...commonProps} />;
      case 'sort': return <SortTool {...commonProps} />;
      case 'img-to-pdf': return <ImagesToPdfTool {...commonProps} />;
      default: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card 
            title="Fusionar PDF" 
            description="Combina múltiples archivos PDF en un solo documento ordenado."
            color="indigo"
            icon={
              <div className="flex items-center gap-1">
                <Files className="w-6 h-6" />
                <ArrowRight className="w-4 h-4" />
                <FileText className="w-6 h-6" />
              </div>
            }
            onClick={() => setView('merge')} 
          />
          <Card 
            title="Extraer Páginas" 
            description="Selecciona y extrae páginas específicas para crear un nuevo PDF."
            color="emerald"
            icon={
              <div className="relative">
                <Files className="w-6 h-6" />
                <ArrowRight className="w-4 h-4 absolute -bottom-2 -right-2 bg-white rounded-full text-emerald-600" />
              </div>
            }
            onClick={() => setView('extract')} 
          />
          <Card 
            title="Eliminar Contraseña" 
            description="Quita la seguridad de PDFs protegidos si conoces la clave."
            color="rose"
            icon={<Unlock className="w-8 h-8" />}
            onClick={() => setView('unlock')} 
          />
          <Card 
            title="Ordenar Páginas" 
            description="Visualiza todas las páginas, reordénalas arrastrando y guarda."
            color="amber"
            icon={<Move className="w-8 h-8" />}
            onClick={() => setView('sort')} 
          />
          <Card 
            title="Imágenes a PDF" 
            description="Convierte tus imágenes JPG o PNG en un documento PDF."
            color="blue"
            icon={
              <div className="flex items-center gap-1">
                <ImageIcon className="w-6 h-6" />
                <ArrowRight className="w-4 h-4" />
                <FileText className="w-6 h-6" />
              </div>
            }
            onClick={() => setView('img-to-pdf')} 
          />
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-indigo-100 selection:text-indigo-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Files className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">My PDF Toolkit</h1>
          </div>
          {view !== 'home' && (
            <button 
              onClick={() => setView('home')}
              className="text-sm font-medium text-gray-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {renderView()}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        <p>© 2025 PDF Toolkit. Procesamiento local y seguro.</p>
      </footer>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce-in z-50 ${notification.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.msg}</span>
        </div>
      )}

      {/* Image Preview Modal con Zoom */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-hidden" onClick={() => setPreviewImg(null)}>
          <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
             {/* Toolbar */}
             <div className="absolute top-4 flex items-center gap-2 bg-white/10 backdrop-blur rounded-full p-2 text-white border border-white/20 z-10">
                <button onClick={() => handleZoom(-0.25)} className="p-2 hover:bg-white/20 rounded-full" title="Zoom Out"><ZoomOut className="w-5 h-5"/></button>
                <span className="text-sm font-mono w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => handleZoom(0.25)} className="p-2 hover:bg-white/20 rounded-full" title="Zoom In"><ZoomIn className="w-5 h-5"/></button>
                <div className="w-px h-6 bg-white/20 mx-2"></div>
                <button onClick={() => setPreviewImg(null)} className="p-2 hover:bg-red-500/50 rounded-full" title="Cerrar"><X className="w-5 h-5"/></button>
             </div>

             {/* Imagen con scroll si es necesario */}
             <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
                <img 
                  src={previewImg} 
                  className="max-w-none transition-transform duration-200 ease-out rounded shadow-2xl" 
                  style={{ transform: `scale(${zoomLevel})` }}
                  alt="Preview" 
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function downloadBlob(data: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([data as BlobPart], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

