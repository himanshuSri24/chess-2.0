"use client";

import { UserNav } from "@/components/navbar/user-nav";
import { Button } from "@/components/ui/button";
import { FC, useState, useEffect } from "react";
import { useUser } from "reactfire";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "reactfire";
import { Moon, Sun } from "lucide-react";

interface Props {
  onSignIn?: () => void;
}

export const NavbarUserLinks: FC<Props> = ({ onSignIn }) => {
  const { data, hasEmitted } = useUser();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? !document.documentElement.classList.contains("light")
      : true
  );

  const doProviderSignIn = async (provider: GoogleAuthProvider) => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, provider);
      // create user in your database here
      toast({ title: "Signed in!" });
      onSignIn?.();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error signing in", description: `${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    if (typeof window === "undefined") return;
    const html = document.documentElement;
    if (html.classList.contains("light")) {
      html.classList.remove("light");
      setIsDark(true);
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.add("light");
      setIsDark(false);
      localStorage.setItem("theme", "light");
    }
  };

  // On mount, sync with localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const theme = localStorage.getItem("theme");
    if (theme === "light") {
      document.documentElement.classList.add("light");
      setIsDark(false);
    } else if (theme === "dark") {
      document.documentElement.classList.remove("light");
      setIsDark(true);
    }
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle dark mode"
        onClick={toggleDarkMode}
        icon={
          isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
        }
      />
      {hasEmitted && data ? (
        <>
          <UserNav />
        </>
      ) : (
        <>
          <Button
            className="w-full"
            disabled={isLoading}
            onClick={async () => {
              const provider = new GoogleAuthProvider();
              await doProviderSignIn(provider);
            }}
          >
            Login / Register
          </Button>
        </>
      )}
    </>
  );
};
