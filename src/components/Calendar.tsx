import { getCollection } from "astro:content";
import { twMerge } from "tailwind-merge";
import { Link } from "./Link";
import { MONTHS, dateToDay, festYear, yyyymmdd } from "../schedule";

const days = await getCollection("days");

const titles = days.reduce(
  (titles, { id, data }) => ({
    ...titles,
    [Number(id)]: data.title,
  }),
  {} as Record<number, string>
);

const year = festYear();

const months = MONTHS.map((month) => {
  const first = new Date(year, month, 1);

  // Get the day at the beginning of the week for the calendar display
  const beginningOfWeek = new Date(first);
  beginningOfWeek.setDate(1 - first.getDay());

  // All dates that will end up on the calendar, through the end of the last week
  const dates: Date[] = [];
  for (
    const currentDate = new Date(beginningOfWeek);
    currentDate.getMonth() !== (month + 1) % 12 || currentDate.getDay() !== 0;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    dates.push(new Date(currentDate));
  }

  return {
    month,
    name: first.toLocaleDateString("en-US", { month: "long" }),
    dates,
  };
});

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarProps {
  current: number;
  className?: string;
}

export function Calendar({ current, className }: CalendarProps) {
  return (
    <div className="flex flex-col gap-6">
      {months.map(({ month, name, dates }) => (
        <div key={month} className="flex flex-col items-center">
          <div className="text-2xl font-bold mb-1">{name}</div>
          <div
            className={twMerge(
              "grid grid-cols-7 gap-px w-full bg-yeti-dark-3 border-yeti-dark-3 border rounded-lg",
              className
            )}
          >
            {daysOfWeek.map((dow, i) => (
              <span
                key={dow}
                className={twMerge(
                  "bg-yeti-light-9 text-center text-white py-1",
                  i === 0 && "rounded-tl-lg",
                  i === 6 && "rounded-tr-lg"
                )}
              >
                {dow[0]}
                <span className="hidden md:inline">{dow.slice(1)}</span>
              </span>
            ))}

            {dates.map((date, i) => {
              const day = dateToDay(date);
              const rounded = twMerge(
                i === dates.length - 7 && "rounded-bl-lg",
                i === dates.length - 1 && "rounded-br-lg"
              );

              if (date.getMonth() !== month || !day || !(day in titles)) {
                return (
                  <div
                    key={yyyymmdd(date)}
                    className={twMerge(
                      "flex flex-col w-full h-full px-3 py-2",
                      date.getMonth() === month ? "bg-white/90" : "bg-white/50",
                      rounded
                    )}
                  >
                    <time
                      dateTime={yyyymmdd(date)}
                      title={date.toLocaleDateString()}
                      className="text-yeti-dark-1"
                    >
                      {date.getDate()}
                    </time>
                  </div>
                );
              }

              return (
                <Link
                  key={yyyymmdd(date)}
                  href={`/day/${day.toString().padStart(2, "0")}`}
                  className={twMerge(
                    "flex flex-col items-start w-full h-full px-3 py-2 relative focus:z-10 !text-yeti-dark !no-underline break-words",
                    current <= day && "bg-white hover:bg-yeti-light-1",
                    current > day &&
                      "bg-yeti-dark-1 hover:bg-yeti-dark-3 !text-white after:absolute after:inset-0 after:bg-strike-out",
                    rounded
                  )}
                >
                  <time
                    dateTime={yyyymmdd(date)}
                    title={date.toLocaleDateString()}
                    className={twMerge(
                      "font-bold",
                      current === day &&
                        "bg-yeti-light aspect-square text-center rounded-full"
                    )}
                  >
                    {date.getDate()}
                  </time>
                  <div className="text-sm mt-2 hidden md:block w-full">
                    Day {day}: {titles[day]}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
