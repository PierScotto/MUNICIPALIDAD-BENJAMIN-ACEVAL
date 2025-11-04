const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

const inputPath = path.resolve(__dirname, '..', 'public', 'input.css');
const outputPath = path.resolve(__dirname, '..', 'public', 'output.css');

async function build() {
  try {
    const css = fs.readFileSync(inputPath, 'utf8');
    const result = await postcss([tailwindcss(), autoprefixer]).process(css, {
      from: inputPath,
      to: outputPath,
      map: false,
    });
    fs.writeFileSync(outputPath, result.css, 'utf8');
    console.log('Generado:', outputPath);
  } catch (err) {
    console.error('Error al generar CSS con Tailwind:', err);
    process.exitCode = 1;
  }
}

build();
