import type { ReactNode } from "react";

/**
 * Keeps your work phone-sized.
 *
 * On a real phone it fills the screen. On desktop it centers your app inside a
 * 390x844 frame (a common phone size) so what you see while building matches
 * what we will open on a phone. Design for the frame, not for a wide window.
 *
 * You can restyle or replace this, but keep the app mobile-first.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-neutral-100 sm:p-6">
      <div className="relative h-dvh w-full overflow-hidden bg-white sm:h-[844px] sm:w-[390px] sm:rounded-[2.5rem] sm:shadow-xl sm:ring-1 sm:ring-black/10">
        {children}
      </div>
    </div>
  );
}
