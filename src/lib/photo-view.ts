// Serialisable photo data shared by server pages and client components.

export interface PhotoView {
  id: number
  width: number
  height: number
  placeholder: string | null
  color: string | null
  alt: string
  title: string | null
  caption: string | null
  takenAt: string | null
  camera: string | null
  lens: string | null
  focalLength: number | null
  aperture: number | null
  exposureTime: number | null
  iso: number | null
  /** ~960 px, for grids */
  src: string
  srcSet: string
  /** largest size, for the viewer */
  large: string
  seriesSlug: string | null
  seriesTitle: string | null
  genre: string | null
}

const ROMAN = ["", "", " II", " III", " IV", " V", " VI"];

/** Readable camera name: "SONY ILCE-7C" → "Sony α7C", "SONY ILCE-7RM4" → "Sony α7R IV". */
export function cameraLabel(camera: string | null): string | null {
  if (!camera) return null;
  const sony = camera.match(/^SONY\s+ILCE-(\d+)([A-Z]*?)(?:M(\d))?$/i);
  if (sony) return `Sony α${sony[1]}${sony[2].toUpperCase()}${sony[3] ? ROMAN[Number(sony[3])] ?? ` ${sony[3]}` : ""}`;
  return camera.replace(/^(SONY|CANON|NIKON|FUJIFILM|LEICA|PANASONIC|OLYMPUS)\b/, (m) => m[0] + m.slice(1).toLowerCase());
}

/** "85 mm · f/4 · 1/4000 s · ISO 100" — only the parts that are known. */
export function exposureLine(p: Pick<PhotoView, 'focalLength' | 'aperture' | 'exposureTime' | 'iso'>): string {
  const parts: string[] = []
  if (p.focalLength) parts.push(`${Math.round(p.focalLength)} mm`)
  if (p.aperture) parts.push(`f/${Number(p.aperture.toFixed(1))}`)
  if (p.exposureTime) {
    parts.push(
      p.exposureTime >= 1
        ? `${Number(p.exposureTime.toFixed(1))} s`
        : `1/${Math.round(1 / p.exposureTime)} s`,
    )
  }
  if (p.iso) parts.push(`ISO ${p.iso}`)
  return parts.join(' · ')
}

/** Inline style that shows the blurred placeholder until the image has loaded. */
export function placeholderStyle(p: Pick<PhotoView, 'placeholder' | 'color'>): React.CSSProperties {
  return {
    backgroundColor: p.color ?? undefined,
    backgroundImage: p.placeholder ? `url("${p.placeholder}")` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}
