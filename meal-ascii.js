const shades = '@#%*+=-:. ';
const cellRatio = 0.5;

export function mealAscii(image) {
  const { naturalWidth: width, naturalHeight: height } = image;
  const scale = Math.min(27 / width, 13 / (height * cellRatio));
  const columns = Math.max(1, Math.round(width * scale));
  const rows = Math.max(1, Math.round(height * scale * cellRatio));
  const canvas = document.createElement('canvas');
  canvas.width = columns;
  canvas.height = rows;
  const pixels = canvas.getContext('2d');
  pixels.fillStyle = '#fff';
  pixels.fillRect(0, 0, columns, rows);
  pixels.drawImage(image, 0, 0, columns, rows);
  const { data } = pixels.getImageData(0, 0, columns, rows);
  const luminance = [];
  for (let index = 0; index < data.length; index += 4) {
    luminance.push(data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722);
  }
  const low = Math.min(...luminance);
  const range = Math.max(40, Math.max(...luminance) - low);
  return Array.from({ length: rows }, (_, row) => luminance
    .slice(row * columns, (row + 1) * columns)
    .map((value) => shades[Math.round(((value - low) / range) * (shades.length - 1))])
    .join('')).join('\n');
}
