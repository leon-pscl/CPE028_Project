import type { RoadmapStep } from '@/types'

export const REPAIR_STEPS: RoadmapStep[] = [
  {
    id: 'r1',
    title: 'Back up your data',
    description: 'Before any repair, back up photos, contacts, and important files to cloud storage or an external drive.',
    type: 'action',
    completed: false,
  },
  {
    id: 'r2',
    title: 'Get a repair quote',
    description: 'Use the Connect module to find a verified repair shop near you. Compare prices from at least 2 shops.',
    type: 'referral',
    completed: false,
  },
  {
    id: 'r3',
    title: 'Confirm warranty status',
    description: 'Check if your device is still under manufacturer warranty. Some repairs may be covered at no cost.',
    type: 'info',
    completed: false,
  },
  {
    id: 'r4',
    title: 'Send for repair',
    description: 'Bring your device to the chosen repair shop. Ask about warranty on the repair work.',
    type: 'action',
    completed: false,
  },
]

export const RECYCLE_STEPS: RoadmapStep[] = [
  {
    id: 'c1',
    title: 'Back up your data',
    description: 'Save any important files, photos, and contacts before wiping your device.',
    type: 'action',
    completed: false,
  },
  {
    id: 'c2',
    title: 'Wipe your data',
    description: 'Perform a factory reset and remove all accounts. This is mandatory before recycling — your personal data must be protected.',
    type: 'download',
    completed: false,
  },
  {
    id: 'c3',
    title: 'Remove SIM and SD cards',
    description: 'Take out your SIM card, SD card, and any removable accessories. Keep these for your next device.',
    type: 'action',
    completed: false,
  },
  {
    id: 'c4',
    title: 'Find a drop-off point',
    description: 'Use the Connect module to locate a verified recycling facility or e-waste drop-off point near you.',
    type: 'referral',
    completed: false,
  },
]

export function getRoadmapSteps(direction: 'REPAIR' | 'RECYCLE'): RoadmapStep[] {
  return direction === 'REPAIR' ? [...REPAIR_STEPS] : [...RECYCLE_STEPS]
}
