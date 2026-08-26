import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function FormSubmit(props: Props) {
  return (
    <input
      {...props}
      type="submit"
      className="
        w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white
        transition-all duration-200
        hover:bg-zinc-800
        active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-60
        focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2
        cursor-pointer
      "
    />
  );
}
