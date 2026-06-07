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
const SHOW_SERVICES = process.env.NEXT_PUBLIC_SHOW_SERVICES === "true";

export function PhotographyTabs({
  albums,
  testimonials,
  translations,
}: PhotographyTabsProps) {
  // We use useState to manage the active tab. We start with a default.
  const [activeTab, setActiveTab] = useState("feed");

  // Load Saved State on mount
  useEffect(() => {
    const savedTab = localStorage.getItem(TABS_STORAGE_KEY);
    if (savedTab && (savedTab !== "services" || SHOW_SERVICES)) {
      setActiveTab(savedTab);
    }
  }, []);

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
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="mt-8 md:mt-12"
      >
        <TabsList
          className={`grid w-full bg-transparent p-0 border-b ${
            SHOW_SERVICES ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          <TabsTrigger
            value="feed"
            className="flex-col items-center justify-center gap-2 p-4"
            aria-label={translations.feed}
            data-umami-event="tab_clicked"
            data-umami-event-tab="feed"
          >
            <Grid3x3 className="h-6 w-6" />
          </TabsTrigger>
          {SHOW_SERVICES && (
            <TabsTrigger
              value="services"
              className="flex-col items-center justify-center gap-2 p-4"
              aria-label={translations.services}
              data-umami-event="tab_clicked"
              data-umami-event-tab="services"
            >
              <Briefcase className="h-6 w-6" />
            </TabsTrigger>
          )}
          <TabsTrigger
            value="testimonials"
            className="flex-col items-center justify-center gap-2 p-4"
            aria-label={translations.testimonials}
            data-umami-event="tab_clicked"
            data-umami-event-tab="testimonials"
          >
            <Star className="h-6 w-6" />
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="flex-col items-center justify-center gap-2 p-4"
            aria-label={translations.contact}
            data-umami-event="tab_clicked"
            data-umami-event-tab="contact"
          >
            <Mail className="h-6 w-6" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="feed" className="mt-0">
          <PhotoGridSection albums={albums} />
        </TabsContent>
        {SHOW_SERVICES && (
          <TabsContent value="services" className="mt-8">
            <ServicesSection />
          </TabsContent>
        )}
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
