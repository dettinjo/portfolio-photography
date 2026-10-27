// File names for downloads.

/** RFC 6266 Content-Disposition with a safe ASCII fallback and the real UTF-8 name. */
export const attachment = (name: string) =>
  `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(name)}`

export const webName = (filename: string) => `${filename.replace(/\.[^.]+$/, '')}-web.jpg`
