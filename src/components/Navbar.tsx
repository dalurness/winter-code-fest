import { MdCalendarMonth, MdEventBusy } from "react-icons/md";
import { Calendar } from "./Calendar";
import { Link } from "./Link";
import { Modal } from "./Modal";

const { BASE_URL } = import.meta.env;

export interface NavbarProps {
  day: number;
}

export function Navbar({ day }: NavbarProps) {
  return (
    <header className="bg-yeti-light-3 w-full">
      <div className="flex items-center gap-4 max-w-screen-lg w-full mx-auto px-4 md:px-6 py-3">
        <Link
          href="/"
          className="flex justify-center items-center gap-2 font-bold text-2xl !text-yeti-dark"
        >
          <img src={BASE_URL + "logo.svg"} alt="Logo" className="w-10" />
          WCF
        </Link>
        <Modal
          className="ml-auto"
          button={
            <div className="hover:text-yeti-dark-7 cursor-pointer">
              <MdCalendarMonth size={32} className="group-open:hidden" />
              <MdEventBusy size={32} className="hidden group-open:block" />
            </div>
          }
        >
          <nav className="fixed right-0 left-0 md:left-auto z-10 flex flex-col bg-yeti-light-3 shadow-lg p-4 md:px-8 rounded-md md:rounded-r-none h-full w-screen md:max-w-screen-lg">
            <Calendar current={day} />
          </nav>
        </Modal>
      </div>
    </header>
  );
}
