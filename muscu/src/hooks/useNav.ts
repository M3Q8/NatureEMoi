import { createContext, useContext } from 'react'
import type { Tab } from '../components/TabBar'

export type ReglagesView = 'main' | 'exercises' | 'templates'

export const NavContext = createContext<{ goTo: (tab: Tab, view?: ReglagesView) => void }>({ goTo: () => {} })

export const useNav = () => useContext(NavContext)
