"use client";

import { UserNav } from "@/components/navbar/user-nav";
import { Button } from "@/components/ui/button";
import { FC, useState } from "react";
import { useUser } from "reactfire";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "reactfire";

interface Props {
  onSignIn?: () => void;
}

export const NavbarUserLinks: FC<Props> = ({ onSignIn }) => {
  const { data, hasEmitted } = useUser();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <>
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
