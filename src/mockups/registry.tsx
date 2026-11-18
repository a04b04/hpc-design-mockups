import type { ComponentType } from 'react'
import Mockup01App from './mockup-01/Mockup01App'
import ConsoleApp from './mockup-02/components/ConsoleApp'
import AetherApp from './mockup-03/components/App'
import EnuccAzureApp from './mockup-04/components/ConsoleApp'
import EnuccCoreApp from './mockup-05/components/ConsoleApp'

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
  {
    id: 'mockup-04',
    name: '04 · Enucc Console — Azure',
    desc: 'Same AWS-style console as 02, recoloured to a clean & energetic blueberry / sky-blue / amethyst palette',
    Component: EnuccAzureApp,
  },
  {
    id: 'mockup-05',
    name: '05 · Enucc Console — Core',
    desc: 'Independent copy of mockup-02 — same AWS-style console, seeded for future design iteration',
    Component: EnuccCoreApp,
  },
]
