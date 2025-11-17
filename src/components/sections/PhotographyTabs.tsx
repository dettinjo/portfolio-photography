// portfolio-frontend/src/components/sections/photography/PhotographyTabs.tsx
"use client";

// --- THIS IS THE FIX (Part 1): Import useState and useEffect ---
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoGridSection } from "./PhotoGridSection";
import { ServicesSection } from "./ServicesSection";
import { ContactSection } from "./ContactSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { Grid3x3, Briefcase, Star, Mail } from "lucide-react";
import { motion } from "framer-motion";

// --- Interfaces remain the same ---
interface Album {
  id: number;
  slug: string;
  title: string;
  coverImageUrl: string;
  images: string[];
}
interface Testimonial {
  quote: string;
  name: string;
  role: string;
  avatar: string | null;
  ratings: Record<string, number>;
}
interface PhotographyTabsProps {
  albums: Album[];
  testimonials: Testimonial[];
  translations: {
    feed: string;
    services: string;
    testimonials: string;
    contact: string;
  };
}

const TABS_STORAGE_KEY = "photography-active-tab";

export function PhotographyTabs({
  albums,
  testimonials,
  translations,
}: PhotographyTabsProps) {
  // --- THIS IS THE FIX (Part 2): State Management ---
  // We use useState to manage the active tab. We start with a default.
  const [activeTab, setActiveTab] = useState("feed");

  // --- THIS IS THE FIX (Part 3): Load Saved State ---
  // This useEffect runs ONLY ONCE when the component mounts on the client.
  // It checks localStorage for a saved tab and updates the state if found.
  useEffect(() => {
    const savedTab = localStorage.getItem(TABS_STORAGE_KEY);
    // You can add more validation here to ensure savedTab is one of the valid tab values
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []); // The empty dependency array [] ensures this runs only once.

  // --- THIS IS THE FIX (Part 4): Handle State Changes ---
  // This function is called whenever a new tab is clicked.
  // It updates our React state AND saves the new tab to localStorage.
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem(TABS_STORAGE_KEY, value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="sticky z-40 bg-background pt-4"
      style={{ top: "var(--header-offset, 56px)" }}
    >
      {/* --- THIS IS THE FIX (Part 5): Control the Tabs Component --- */}
      {/* We replace `defaultValue` with `value` and add `onValueChange`. */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="mt-8 md:mt-12"
      >
        <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 border-b">
          <TabsTrigger
            value="feed"
            className="flex-col items-center justify-center gap-2 p-4"
            aria-label={translations.feed}
          >
            <Grid3x3 className="h-6 w-6" />
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="flex-col items-center justify-center gap-2 p-4"
            aria-label={translations.services}
          >
            <Briefcase className="h-6 w-6" />
          </TabsTrigger>
          <TabsTrigger
            value="testimonials"
            className="flex-col items-center justify-center gap-2 p-4"
            aria-label={translations.testimonials}
          >
            <Star className="h-6 w-6" />
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="flex-col items-center justify-center gap-2 p-4"
            aria-label={translations.contact}
          >
            <Mail className="h-6 w-6" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="feed" className="mt-0">
          <PhotoGridSection albums={albums} />
        </TabsContent>
        <TabsContent value="services" className="mt-8">
          <ServicesSection />
        </TabsContent>
        <TabsContent value="testimonials" className="mt-8">
          <TestimonialsSection testimonials={testimonials} />
        </TabsContent>
        <TabsContent value="contact" className="mt-8">
          <ContactSection />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
