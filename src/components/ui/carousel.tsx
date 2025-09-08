import React, { useRef } from "react";

interface CarouselProps {
  children: React.ReactNode;
}

export default function Carousel({ children }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    scrollRef.current.scrollTo({
      left: direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white p-2 shadow rounded-full hover:bg-gray-100"
      >
        ‹
      </button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-10 py-4"
      >
        {React.Children.map(children, (child) => (
          <div className="snap-start shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4">{child}</div>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white p-2 shadow rounded-full hover:bg-gray-100"
      >
        ›
      </button>
    </div>
  );
}
