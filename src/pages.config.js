import Dashboard from './pages/Dashboard';
import Finances from './pages/Finances';
import Clients from './pages/Clients';
import Receipts from './pages/Receipts';
import Students from './pages/Students';
import Settings from './pages/Settings';
import Schedule from './pages/Schedule';
import AutoSchedule from './pages/AutoSchedule';
import MyHours from './pages/MyHours';
import Budget from './pages/Budget';
import Login from './pages/Login';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Dashboard": Dashboard,
    "Finances": Finances,
    "Clients": Clients,
    "Receipts": Receipts,
    "Students": Students,
    "Settings": Settings,
    "Schedule": Schedule,
    "AutoSchedule": AutoSchedule,
    "MyHours": MyHours,
    "Budget": Budget,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};