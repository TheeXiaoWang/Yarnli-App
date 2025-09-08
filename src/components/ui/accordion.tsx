import React, { useState } from "react";

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ items, allowMultiple = false }) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenIndexes((prev) => {
      if (allowMultiple) {
        return prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index];
      } else {
        return prev.includes(index) ? [] : [index];
      }
    });
  };

  return (
    <div className="w-full divide-y divide-gray-200 border rounded-md">
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index);
        return (
          <div key={index}>
            <button
              className="w-full flex justify-between items-center py-4 px-6 font-medium text-left text-gray-800 hover:bg-gray-50 transition"
              onClick={() => toggleItem(index)}
            >
              {item.title}
              <span
                className={`transform transition-transform duration-200 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                ▼
              </span>
            </button>
            {isOpen && (
              <div className="px-6 pb-4 text-gray-600 text-sm">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
