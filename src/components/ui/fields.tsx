import { forwardRef } from "react";
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cx } from "@/components/ui/cx";

type ValidationTone = "default" | "error" | "success";

function toneClass(tone: ValidationTone): string | undefined {
  if (tone === "error") {
    return "ui-control--error";
  }

  if (tone === "success") {
    return "ui-control--success";
  }

  return undefined;
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  tone?: ValidationTone;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { tone = "default", className, ...props },
  ref,
) {
  return <input ref={ref} className={cx("ui-control", toneClass(tone), className)} {...props} />;
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  tone?: ValidationTone;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { tone = "default", className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx("ui-control ui-textarea", toneClass(tone), className)}
      {...props}
    />
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  tone?: ValidationTone;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { tone = "default", className, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cx("ui-control ui-select", toneClass(tone), className)}
      {...props}
    />
  );
});

type DateInputProps = InputHTMLAttributes<HTMLInputElement> & {
  tone?: ValidationTone;
};

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { tone = "default", className, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type ?? "date"}
      className={cx("ui-control ui-date", toneClass(tone), className)}
      {...props}
    />
  );
});

type FieldLabelProps = HTMLAttributes<HTMLLabelElement>;

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return <label className={cx("ui-field-label", className)} {...props} />;
}

type FieldMessageProps = HTMLAttributes<HTMLParagraphElement> & {
  tone?: ValidationTone;
};

export function FieldMessage({ tone = "default", className, ...props }: FieldMessageProps) {
  return (
    <p
      className={cx(
        "ui-field-msg",
        tone === "error" && "ui-field-msg--error",
        tone === "success" && "ui-field-msg--success",
        className,
      )}
      {...props}
    />
  );
}
