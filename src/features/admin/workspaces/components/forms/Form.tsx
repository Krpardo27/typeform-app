import { FormHTMLAttributes } from "react";
import clsx from "clsx";

type Props = FormHTMLAttributes<HTMLFormElement>;

export default function Form(props: Props) {
  const { children, className } = props;

  return (
    <form
      {...props}
      className={clsx(
        "w-full border border-[#dedede]/15 p-6 rounded-xl",
        "flex flex-col",
        "gap-5",
        "transition-all duration-200",
        className
      )}
    >
      {children}
    </form>
  );
}