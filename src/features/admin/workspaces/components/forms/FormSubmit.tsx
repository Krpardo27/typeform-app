import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function FormSubmit(props: Props) {
  return (
    <input
      {...props}
      type="submit"
      className="
        rounded-xl bg-[#DC2626] px-8 py-3 text-sm font-medium text-white
        transition-all duration-200
        hover:bg-[#b91c1c]
        active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-60
        focus:outline-hidden focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2
        cursor-pointer w-max
      "
    />
  );
}
