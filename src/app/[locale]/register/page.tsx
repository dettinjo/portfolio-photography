// src/app/[locale]/register/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("Auth.RegisterPage");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();
  const cmsUrl =
    ""; // Payload is embedded — REST API is at the same origin

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // Payload's user creation endpoint (admin must allow public create access on Users collection)
      const res = await fetch(`${cmsUrl}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || t("registrationFailed"));
      }

      // Auto-login after registration
      const loginRes = await fetch(`${cmsUrl}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.token) {
        throw new Error(t("registrationFailed"));
      }

      login(loginData.token, { id: loginData.user.id, email: loginData.user.email, name: loginData.user.name });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registrationFailed"));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("usernameLabel")}</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {t("submitButton")}
            </Button>
          </form>
          <Separator className="my-6" />
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              {t("hasAccount")}{" "}
              <Link href="/login" className="underline hover:text-foreground">
                {t("loginLink")}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
