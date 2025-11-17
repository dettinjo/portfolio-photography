"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Box,
  Crown,
  Lightbulb,
  Check,
  Clock,
  Image as ImageIcon,
  Wand2,
  MapPin,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function ServicesSection() {
  const t = useTranslations("photography.ServicesSection");
  const tCalculator = useTranslations("photography.ServicesSection.calculator");

  const yourEmail = "your-photo-email@example.com";

  const [hours, setHours] = useState(1);
  const [images, setImages] = useState(10);
  const [retouchLevel, setRetouchLevel] = useState(1);
  const [distance, setDistance] = useState("");
  const [addExpress, setAddExpress] = useState(false);

  const retouchLevels = useMemo(
    () => [
      tCalculator("levels.basic"),
      tCalculator("levels.advanced"),
      tCalculator("levels.pro"),
    ],
    [tCalculator]
  );

  const calculatedPrice = useMemo(() => {
    const sessionFee = 40;
    const hourlyRate = 55;
    let pricePerImage = 4;
    if (retouchLevel === 2) pricePerImage = 8;
    if (retouchLevel === 3) pricePerImage = 15;
    const numDistance = parseInt(distance, 10) || 0;
    let subtotal =
      sessionFee +
      hours * hourlyRate +
      images * pricePerImage +
      numDistance * 0.5;
    if (addExpress) subtotal *= 1.2;
    return Math.round(subtotal);
  }, [hours, images, retouchLevel, distance, addExpress]);

  const packages = [
    {
      type: "standard",
      icon: <Box className="h-8 w-8 text-background" />,
      price: "120",
    },
    {
      type: "advanced",
      icon: <Crown className="h-8 w-8 text-background" />,
      price: "380",
    },
  ];

  const individualMailto = useMemo(() => {
    const subject = t("mail.subject");
    const body = t("mail.body", {
      hours: hours,
      images: images,
      retouchLevel: retouchLevels[retouchLevel - 1],
      distance: distance || 0,
      expressDelivery: addExpress ? tCalculator("yes") : tCalculator("no"),
      price: calculatedPrice,
    });
    return `mailto:${yourEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }, [
    t,
    tCalculator,
    yourEmail,
    hours,
    images,
    retouchLevel,
    distance,
    addExpress,
    calculatedPrice,
    retouchLevels,
  ]);

  return (
    <section id="services">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {packages.map((pkg) => (
          <motion.div
            key={pkg.type}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            {/* --- HOVER SCALE EFFECT ADDED --- */}
            <Card className="flex flex-col h-full bg-foreground text-background border-transparent transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-background/20 dark:hover:shadow-black/30">
              <CardHeader className="p-6">
                <div className="flex items-center gap-4">
                  {pkg.icon}
                  <CardTitle className="text-2xl font-bold text-background">
                    {t(`${pkg.type}.title`)}
                  </CardTitle>
                </div>
                <CardDescription className="pt-1 min-h-[40px] text-background/80">
                  {t(`${pkg.type}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow p-6 pt-0">
                <Separator className="mb-6 bg-background/30" />
                <ul className="space-y-4">
                  {t.raw(`${pkg.type}.items`).map((item: string) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-400 mt-1" />
                      <span className="text-background/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-4 p-6 pt-0 mt-auto">
                <Separator className="mb-6 bg-background/30" />
                <div>
                  <div className="text-sm text-background/70">
                    {t("price.fixed")}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-background">
                      {pkg.price}
                    </span>
                    <span className="text-xl font-semibold text-background/70">
                      EUR
                    </span>
                  </div>
                </div>
                <Button asChild className="w-full" variant="inverted">
                  <a
                    href={`mailto:${yourEmail}?subject=${encodeURIComponent(
                      t(`${pkg.type}.subject`)
                    )}`}
                  >
                    <Mail className="mr-2 h-4 w-4" /> {t("button")}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          {/* --- HOVER SCALE EFFECT ADDED --- */}
          <Card className="flex flex-col bg-foreground text-background border-transparent shadow-lg shadow-foreground/20 h-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-background/20 dark:hover:shadow-black/30">
            <CardHeader className="p-6">
              <div className="flex items-center gap-4">
                <Lightbulb className="h-8 w-8 text-background" />
                <CardTitle className="text-2xl font-bold text-background">
                  {t("individual.title")}
                </CardTitle>
              </div>
              <CardDescription className="pt-1 min-h-[40px] text-background/80">
                {t("individual.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-6 pt-0">
              <Separator className="mb-6 bg-background/30" />
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <Label htmlFor="hours" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {tCalculator("duration")}
                    </Label>
                    <span className="font-semibold">
                      {hours} {tCalculator("hours")}
                    </span>
                  </div>
                  <Slider
                    id="hours"
                    value={[hours]}
                    onValueChange={([val]) => setHours(val)}
                    min={1}
                    max={8}
                    step={1}
                    className="[&>span:first-child]:bg-background/20 [&>span>span]:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <Label htmlFor="images" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> {tCalculator("images")}
                    </Label>
                    <span className="font-semibold">{images}</span>
                  </div>
                  <Slider
                    id="images"
                    value={[images]}
                    onValueChange={([val]) => setImages(val)}
                    min={5}
                    max={50}
                    step={1}
                    className="[&>span:first-child]:bg-background/20 [&>span>span]:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <Label
                      htmlFor="retouching"
                      className="flex items-center gap-2"
                    >
                      <Wand2 className="h-4 w-4" /> {tCalculator("retouching")}
                    </Label>
                    <span className="font-semibold">
                      {retouchLevels[retouchLevel - 1]}
                    </span>
                  </div>
                  <Slider
                    id="retouching"
                    value={[retouchLevel]}
                    onValueChange={([val]) => setRetouchLevel(val)}
                    min={1}
                    max={3}
                    step={1}
                    className="[&>span:first-child]:bg-background/20 [&>span>span]:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="distance"
                    className="flex items-center gap-2 text-sm"
                  >
                    <MapPin className="h-4 w-4" /> {tCalculator("travel")}
                  </Label>
                  <Input
                    id="distance"
                    type="number"
                    placeholder="e.g., 20"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="border-background/30 placeholder:text-background/50"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="express" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" /> {tCalculator("express")}
                  </Label>
                  <Switch
                    id="express"
                    checked={addExpress}
                    onCheckedChange={setAddExpress}
                    className="data-[state=checked]:bg-background data-[state=unchecked]:bg-background/30 [&>span]:bg-foreground"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 p-6 pt-0 mt-auto">
              <Separator className="mb-6 bg-background/30" />
              <div>
                <div className="text-sm text-background/70">
                  {t("price.estimated")}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-background">
                    {calculatedPrice}
                  </span>
                  <span className="text-xl font-semibold text-background/70">
                    EUR
                  </span>
                </div>
              </div>
              <Button asChild className="w-full" variant="inverted">
                <a href={individualMailto}>
                  <Mail className="mr-2 h-4 w-4" /> {t("buttonIndividual")}
                </a>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}
