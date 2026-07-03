export function getSwatchStyle(colorHex?: string | null): React.CSSProperties {
  if (!colorHex) return {};

  const colors = colorHex.split(',').map(c => c.trim()).filter(Boolean);
  
  if (colors.length === 0) return {};

  if (colors.length === 1) {
    return { backgroundColor: colors[0] };
  }

  if (colors.length === 2) {
    return {
      background: `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
    };
  }

  if (colors.length === 3) {
    return {
      background: `conic-gradient(${colors[0]} 0 33.33%, ${colors[1]} 33.33% 66.66%, ${colors[2]} 66.66% 100%)`
    };
  }

  // 4 or more colors (split evenly)
  const step = 100 / colors.length;
  const gradientParts = colors.map((color, index) => {
    const start = index * step;
    const end = (index + 1) * step;
    return `${color} ${start}% ${end}%`;
  });

  return {
    background: `conic-gradient(${gradientParts.join(', ')})`
  };
}
