// Fonts shared by the public site and /studio.
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from "next/font/google";

// Characterful grotesque (with width/optical-size axes) for text and display,
// an italic serif for accent words, a mono for camera-style readouts.
export const sans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
  axes: ["opsz", "wdth"],
});
export const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  variable: "--font-serif",
});
export const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
