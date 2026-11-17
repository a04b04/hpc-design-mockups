import type { ComponentType } from 'react'
import Mockup01App from './mockup-01/Mockup01App'
import ConsoleApp from './mockup-02/components/ConsoleApp'
import AetherApp from './mockup-03/components/App'

export type MockupEntry = {
  id: string
  name: string
  desc: string
  Component: ComponentType
}

// Register every mockup here — adding a new one appends a single entry.
export const MOCKUPS: MockupEntry[] = [
  {
    id: 'mockup-01',
    name: '01 · Helios Console',
    desc: 'Premium dark infrastructure console — Linear/Vercel inspired',
    Component: Mockup01App,
  },
  {
    id: 'mockup-02',
    name: '02 · Enucc Console',
    desc: 'AWS Management Console inspired — enterprise HPC cluster administration',
    Component: ConsoleApp,
  },
  {
    id: 'mockup-03',
    name: '03 · Aether Console',
    desc: 'Futuristic ops-centre HPC console — AETHER HPC · TITAN-02 · 8,192 nodes',
    Component: AetherApp,
  },
]
