import type React from 'react';

export { CgSpinner as ISpinner } from 'react-icons/cg';
export { FcGoogle as IGoogle } from 'react-icons/fc';
export {
  HiOutlineAdjustmentsHorizontal as IFilter,
  HiOutlineArrowDownRight as IDown,
  HiOutlineArrowLeftOnRectangle as ILogoutLeft,
  HiOutlineArrowRightOnRectangle as ILogoutRight,
  HiOutlineArrowsPointingOut as IExpand,
  HiOutlineArrowUpRight as IUp,
  HiOutlineBars3 as IMenuBars,
  HiOutlineBolt as IBolt,
  HiOutlineCalendarDays as ICalendar,
  HiOutlineChartBar as IChart,
  HiOutlineCog6Tooth as ISettings,
  HiOutlineCreditCard as ICard,
  HiOutlineDocumentText as IReport,
  HiOutlineEllipsisVertical as IMenu,
  HiOutlineGlobeAlt as IGlobe,
  HiOutlineHome as IHome,
  HiOutlineLink as ILink,
  HiOutlineLockClosed as ILock,
  HiOutlinePencilSquare as IEdit,
  HiOutlinePlus as IPlus,
  HiOutlineShieldCheck as IShield,
  HiOutlineTrash as ITrash,
  HiOutlineUsers as IUsers,
  HiOutlineXMark as IClose,
} from 'react-icons/hi2';
export { SiFirefoxbrowser as IFirefox, SiGithub as IGithub, SiGooglechrome as IChrome, SiSafari as ISafari } from 'react-icons/si';

type IconProps = React.SVGProps<SVGSVGElement>;

export const ChevronDown = (props: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
