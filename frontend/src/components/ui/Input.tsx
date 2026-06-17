import React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full border border-border rounded-input px-3 py-2 text-sm text-ink bg-surface-card " +
  "placeholder:text-ink-faint transition-shadow duration-200 disabled:opacity-60 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "resize-none", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldBase, "pr-9", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  children,
  required,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium text-ink mb-1.5", className)}>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
