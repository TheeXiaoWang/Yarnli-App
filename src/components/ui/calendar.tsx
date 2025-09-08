import React, { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function generateCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const calendar: (number | null)[][] = [];
  let week: (number | null)[] = [];

  // Fill initial empty days
  for (let i = 0; i < startDay; i++) week.push(null);

  // Fill the month
  for (let day = 1; day <= totalDays; day++) {
    week.push(day);
    if (week.length === 7) {
      calendar.push(week);
      week = [];
    }
  }

  // Fill remaining days
  if (week.length) {
    while (week.length < 7) week.push(null);
    calendar.push(week);
  }

  return calendar;
}

export default function Calendar() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleDayClick = (day: number | null) => {
    if (day === null) return;
    setSelectedDate(new Date(currentYear, currentMonth, day));
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const calendar = generateCalendar(currentYear, currentMonth);
  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });

  return (
    <div className="max-w-sm p-4 border rounded-lg shadow bg-white">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={prevMonth}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100"
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {monthName} {currentYear}
        </span>
        <button
          onClick={nextMonth}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-xs text-center text-gray-500 mb-2">
        {DAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {calendar.flat().map((day, idx) => {
          const isToday =
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();

          const isSelected =
            day &&
            selectedDate &&
            day === selectedDate.getDate() &&
            currentMonth === selectedDate.getMonth() &&
            currentYear === selectedDate.getFullYear();

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={!day}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition ${
                isSelected
                  ? "bg-blue-500 text-white"
                  : isToday
                  ? "border border-blue-500"
                  : "hover:bg-gray-100"
              } ${!day ? "opacity-30 cursor-default" : ""}`}
            >
              {day || ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
