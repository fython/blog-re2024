import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "type"> & {
  overlay?: boolean;
};

export default function RangeSlider({
  overlay = false,
  className = "",
  ...props
}: Props) {
  const thumb =
    "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-background [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-background";
  const track = overlay
    ? "pointer-events-none absolute inset-0 h-6 focus:z-10 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:-mt-1 [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto"
    : "h-5 cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:-mt-[5px] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent";
  return (
    <input
      type="range"
      className={`focus-visible:outline-accent w-full appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 ${thumb} ${track} ${className}`}
      {...props}
    />
  );
}
