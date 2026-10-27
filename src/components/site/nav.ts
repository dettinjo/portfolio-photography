import { Camera, Images, Mail, User } from "lucide-react";

/** Primary navigation, shared by the header, the mobile menu and the app tab bar. */
export const NAV_ITEMS = [
  { href: "/", key: "home", icon: Camera },
  { href: "/work", key: "work", icon: Images },
  { href: "/about", key: "about", icon: User },
  { href: "/contact", key: "contact", icon: Mail },
] as const;

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
