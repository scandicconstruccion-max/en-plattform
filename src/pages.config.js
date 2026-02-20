/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Ansatte from './pages/Ansatte';
import ApproveOrder from './pages/ApproveOrder';
import ApproveQuote from './pages/ApproveQuote';
import Avvik from './pages/Avvik';
import AvvikDetaljer from './pages/AvvikDetaljer';
import Befaring from './pages/Befaring';
import Bestillinger from './pages/Bestillinger';
import Bildedok from './pages/Bildedok';
import BrukerAdmin from './pages/BrukerAdmin';
import CRM from './pages/CRM';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import Endringsmeldinger from './pages/Endringsmeldinger';
import FDV from './pages/FDV';
import FDVDetaljer from './pages/FDVDetaljer';
import Faktura from './pages/Faktura';
import FakturaDetaljer from './pages/FakturaDetaljer';
import Innstillinger from './pages/Innstillinger';
import Kalender from './pages/Kalender';
import Lonnsgrunnlag from './pages/Lonnsgrunnlag';
import MinBedrift from './pages/MinBedrift';
import Ordre from './pages/Ordre';
import OrdreDetaljer from './pages/OrdreDetaljer';
import ProsjektDetaljer from './pages/ProsjektDetaljer';
import Prosjekter from './pages/Prosjekter';
import Prosjektfiler from './pages/Prosjektfiler';
import Ressursplan from './pages/Ressursplan';
import Sjekklister from './pages/Sjekklister';
import Tilbud from './pages/Tilbud';
import Timelister from './pages/Timelister';
import ApproveDeviation from './pages/ApproveDeviation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Ansatte": Ansatte,
    "ApproveOrder": ApproveOrder,
    "ApproveQuote": ApproveQuote,
    "Avvik": Avvik,
    "AvvikDetaljer": AvvikDetaljer,
    "Befaring": Befaring,
    "Bestillinger": Bestillinger,
    "Bildedok": Bildedok,
    "BrukerAdmin": BrukerAdmin,
    "CRM": CRM,
    "Chat": Chat,
    "Dashboard": Dashboard,
    "Endringsmeldinger": Endringsmeldinger,
    "FDV": FDV,
    "FDVDetaljer": FDVDetaljer,
    "Faktura": Faktura,
    "FakturaDetaljer": FakturaDetaljer,
    "Innstillinger": Innstillinger,
    "Kalender": Kalender,
    "Lonnsgrunnlag": Lonnsgrunnlag,
    "MinBedrift": MinBedrift,
    "Ordre": Ordre,
    "OrdreDetaljer": OrdreDetaljer,
    "ProsjektDetaljer": ProsjektDetaljer,
    "Prosjekter": Prosjekter,
    "Prosjektfiler": Prosjektfiler,
    "Ressursplan": Ressursplan,
    "Sjekklister": Sjekklister,
    "Tilbud": Tilbud,
    "Timelister": Timelister,
    "ApproveDeviation": ApproveDeviation,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};