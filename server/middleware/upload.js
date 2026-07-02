import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Asegurar que el directorio de uploads/historico exista
const uploadDir = path.join(process.cwd(), 'uploads', 'historico');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar un nombre de archivo único para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Limpiar el nombre del archivo de caracteres extraños
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de tipos de archivos (solo PDFs)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos en formato PDF.'), false);
  }
};

// Exportar la configuración del middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de tamaño de archivo opcional: 10 MB
  }
});

export default upload;
