import { LabelHTMLAttributes } from "react";
import clsx from "clsx";

type Props = LabelHTMLAttributes<HTMLLabelElement>;

export default function FormLabel({
  children,
  className,
  ...props
}: Props) {
  return (
    <label
      {...props}
      className={clsx(
        "block text-sm font-medium text-[#171717] py-1",
        className
      )}
    >
      {children}
    </label>
  );
}