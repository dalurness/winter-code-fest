import { MdCalendarMonth, MdEventBusy } from "react-icons/md";
import { Calendar } from "./Calendar";
import { Link } from "./Link";

const { BASE_URL } = import.meta.env;

interface Props {
  day: number;
}

export function Navbar({ day }: Props) {
  return (
    <header className="bg-yeti-light-3 w-full">
      <div
        className="flex items-center gap-4 max-w-screen-lg w-full mx-auto px-4 md:px-6 py-3"
      >
        <Link
          href="/"
          className="flex justify-center items-center gap-2 font-bold text-2xl"
        ><img src={BASE_URL + "logo.svg"} alt="Logo" className="w-10" />WCF</Link>
        <details className="ml-auto group">
          <summary className="list-none hover:text-yeti-dark-7 cursor-pointer">
            <MdCalendarMonth size={32} className="group-open:hidden" />
            <MdEventBusy size={32} className="hidden group-open:block" />

            {/* fullscreen background element that you can click to close when it's open */}
            <div className="fixed inset-0 bg-yeti-dark-3/50 hidden group-open:block">
            </div>
          </summary>

          <nav
            className="fixed right-0 left-0 md:left-auto z-10 flex flex-col bg-yeti-light-3 shadow-lg p-4 rounded-md md:rounded-r-none h-full w-screen md:max-w-screen-sm"
          >
            <Calendar current={day} />
          </nav>
        </details>
      </div>
    </header>
  );
}
