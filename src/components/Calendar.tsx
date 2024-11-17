import { getCollection } from "astro:content";
import { twMerge } from "tailwind-merge";
import { Link } from "./Link";

const days = await getCollection("days");

const titles = days.reduce(
  (titles, { slug, data }) => ({
    ...titles,
    [Number(slug)]: data.title,
  }),
  {} as Record<number, string>
);

const now = new Date();

// Get December 1st. Use last year's December if it's January
const december = new Date(
  now.getFullYear() - (now.getMonth() === 0 ? 1 : 0),
  11, // month is 0 indexed
  1
);

// Get the day at the beginning of the week for the calendar display
const beginningOfWeek = new Date(december);
beginningOfWeek.setDate(1 - december.getDay());

// All dates that will end up on the calendar
const dates: Date[] = [];
for (
  const currentDate = new Date(beginningOfWeek);
  !(currentDate.getMonth() === 0 && currentDate.getDay() === 0);
  currentDate.setDate(currentDate.getDate() + 1)
) {
  dates.push(new Date(currentDate));
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarProps {
  current: number;
  className?: string;
}

export function Calendar({ current, className }: CalendarProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-bold mb-1">December</div>
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
          const day = date.getDate();

          if (date.getMonth() !== 11) {
            return (
              <div
                key={yyyymmdd(date)}
                className={twMerge(
                  "flex flex-col w-full h-full px-3 py-2 bg-white/70",
                  i === dates.length - 1 && "rounded-br-lg"
                )}
              >
                <time
                  dateTime={yyyymmdd(date)}
                  title={date.toLocaleDateString()}
                >
                  {day}
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
                i === dates.length - 7 && "rounded-bl-lg",
                i === dates.length - 1 && "rounded-br-lg"
              )}
            >
              <time
                dateTime={yyyymmdd(date)}
                title={date.toLocaleDateString()}
                className={twMerge(
                  current === day &&
                    "bg-yeti-light aspect-square text-center rounded-full"
                )}
              >
                {day}
              </time>
              {day in titles && (
                <div className="text-sm mt-2 hidden md:block w-full">
                  {titles[day]}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format a date in YYYY-MM-DD format
 */
function yyyymmdd(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}
