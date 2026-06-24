import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

const FormInput = forwardRef<HTMLInputElement, Props>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={clsx(
          "w-full rounded-xl px-4 py-3 text-sm transition",
          "bg-[#171717]",
          "text-[#dedede]",
          "placeholder:text-[#dedede]/40",
          "border border-[#dedede]/15",
          "focus:outline-none",
          "focus:border-amber-400",
          "focus:ring-2",
          "focus:ring-amber-400/20",
          error &&
            "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          props.disabled &&
            "opacity-50 cursor-not-allowed",
          className
        )}
      />
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;