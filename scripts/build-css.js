const postcss = require('postcss');
const fs = require('fs');
const path = require('path');

// Importar plugins
const tailwind = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

// Rutas de archivos
const inputFile = './public/input.css';
const outputFile = './public/output.css';

// Leer el archivo de entrada
const css = fs.readFileSync(inputFile, 'utf8');

// Procesar el CSS
postcss([tailwind, autoprefixer])
  .process(css, {
    from: inputFile,
    to: outputFile
  })
  .then(result => {
    // Crear directorio si no existe
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Escribir el archivo de salida
    fs.writeFileSync(outputFile, result.css);
    console.log('✅ CSS generado correctamente en:', outputFile);
  })
  .catch(error => {
    console.error('❌ Error al generar CSS:', error);
    process.exit(1);
  });