"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      toastOptions={{
        className:
          "rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg",
      }}
      {...props}
    />
  );
};

export { Toaster };
