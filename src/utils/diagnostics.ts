export function summarizeElement(el: any): string {
  if (!el) return '(null)';
  const parts: string[] = [
    `num=${el.numInPage}`,
    `type=${el.type}`,
    `page=${el.pageNum}`,
    `layer=${el.layerNum}`,
    `maxX=${el.maxX}`,
    `maxY=${el.maxY}`,
  ];
  if (typeof el.userData === 'string' && el.userData.length > 0) {
    parts.push(`udLen=${el.userData.length}`);
  }
  if (el.stroke) {
    parts.push(`penType=${el.stroke.penType}`, `penColor=${el.stroke.penColor}`, `thickness=${el.thickness}`);
  }
  if (el.recognizeResult?.predict_name) {
    parts.push(`predict=${el.recognizeResult.predict_name}`);
  }
  return `(${parts.join(' ')})`;
}

export function summarizeElements(elements: any[]): string {
  return `count=${elements.length} ${elements.map(summarizeElement).join(', ')}`;
}
