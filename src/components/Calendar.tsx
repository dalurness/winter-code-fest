import { getCollection } from "astro:content";
import { twMerge } from "tailwind-merge";
import { Link } from "./Link";

const days = await getCollection("days");

const titles = days.reduce(
  (titles, { slug, data }) => ({
    ...titles,
    [slug]: data.title,
  }),
  {} as Record<number, string>
);

const december = new Date();
if (december.getMonth() === 0) {
  // Use last year's December if it's January
  december.setFullYear(december.getFullYear() - 1);
}
// set to 1st of December
december.setMonth(11, 1);
const decemberStartDayOfWeek = december.getDay();

interface Props {
  current: number;
  className?: string;
}

export function Calendar({ current, className }: Props) {
  return (
    <div
      className={twMerge(
        "grid grid-cols-3 md:grid-cols-7 w-full border-yeti-dark border-t border-l",
        className
      )}
    >
      {Array.from({ length: decemberStartDayOfWeek }, () => (
        <div className="hidden md:block"></div> // Spacer for days before Dec 1
      ))}
      {Array.from({ length: 31 }, (_, i) => (
        <GridDay day={1 + i} current={current} key={i} />
      ))}
    </div>
  );
}

function GridDay({ day, current }: { day: number; current: number }) {
  return (
    <div className="border-yeti-dark border-b border-r">
      <Link
        href={`/day/${day}`}
        className={twMerge(
          "flex flex-col w-full h-full p-2 relative focus:z-10",
          current < day && "bg-yeti-light-1 hover:bg-yeti-light-3",
          current > day && "bg-yeti-dark-1 hover:bg-yeti-dark-3 text-white",
          current === day && "bg-yeti-light-7 hover:bg-yeti-light-9"
        )}
      >
        <span>{day}</span>
        <div className="text-sm">{titles[day]}</div>
        {current > day && (
          <span className="absolute w-full h-px bg-yeti-dark-9 top-1/2 left-0 right-0 -rotate-45"></span>
        )}
      </Link>
    </div>
  );
}

/*
function TableCalendar({ current, className }: Props) {
  return (
    <table className={twMerge("w-full table-fixed", className)}>
      <tr>
        {Array.from({ length: decemberStartDayOfWeek }, (_, i) => (
          <td colSpan={1} key={i} className="w-[12.4%]"></td> // Spacer for days before Dec 1
        ))}
        {Array.from({ length: 7 - decemberStartDayOfWeek }, (_, i) => (
          <TableDay day={1 + i} current={current} key={i} />
        ))}
      </tr>
      <tr>
        {Array.from({ length: 7 }, (_, i) => (
          <TableDay
            day={7 - decemberStartDayOfWeek + 1 + i}
            current={current}
            key={i}
          />
        ))}
      </tr>
    </table>
  );
}

function TableDay({ day, current }: { day: number; current: number }) {
  return (
    <td colSpan={1} className="w-[12.4%] border border-yeti-dark p-0">
      <a
        href={BASE_URL + "day/" + day}
        className={twMerge(
          "flex flex-col w-full h-full p-2 relative", // border-yeti-dark border-b border-r",
          // day <= 7 && "border-t",
          // ((day - (7 - decemberStartDayOfWeek)) % 7 === 1 || day === 1) &&
          //   "border-l",
          current < day && "bg-yeti-light-1 hover:bg-yeti-light-3",
          current > day && "bg-yeti-dark-1 hover:bg-yeti-dark-3 text-white",
          current === day && "bg-yeti-light-7 hover:bg-yeti-light-9"
        )}
      >
        <span>{day}</span>
        <div className="text-sm">{titles[day]}</div>
        {current > day && (
          <span className="absolute w-full h-px bg-yeti-dark-9 top-1/2 left-0 right-0 -rotate-45"></span>
        )}
      </a>
    </td>
  );
}
*/
