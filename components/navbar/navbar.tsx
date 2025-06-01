import { NavbarMobile } from "@/components/navbar/navbar-mobile";
import { NavbarUserLinks } from "@/components/navbar/navbar-user-links";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { FC } from "react";
import Image from "next/image";

export const NavBar: FC = () => {
  return (
    <>
      <div className="animate-in fade-in w-full">
        <nav className="container px-6 md:px-8 py-4">
          <div className="flex items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className="flex items-center">
                <Image
                  src="/chess.png"
                  alt="Dev with Coffee"
                  width={32}
                  height={32}
                />
                <div className="text-xl font-semibold tracking-tighter text-slate-800 mr-6 ml-2 whitespace-nowrap">
                  Play Chess
                </div>
              </div>
            </Link>
            <div className="hidden md:flex justify-end w-full">
              <div className="flex items-center space-x-4">
                <NavbarUserLinks />
              </div>
            </div>
            <div className="grow md:hidden flex justify-end">
              <NavbarMobile />
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};
