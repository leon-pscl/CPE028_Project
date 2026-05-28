import type { RoadmapStep } from '@/types'

export const REPAIR_STEPS: RoadmapStep[] = [
  {
    id: 'r1',
    title: 'Back up your data',
    description: 'Before any repair, secure your personal files and media.',
    type: 'action',
    completed: false,
    recommended: true,
    subItems: [
      {
        id: 'r1a',
        title: 'Cloud backup',
        description: 'Upload photos and contacts to Google Drive or iCloud.',
        type: 'action',
        completed: false,
        branch: 'left',
      },
      {
        id: 'r1b',
        title: 'Export app data',
        description: 'Save chat histories, notes, and app-specific data.',
        type: 'download',
        completed: false,
        branch: 'right',
      },
    ],
  },
  {
    id: 'r2',
    title: 'Get a repair quote',
    description: 'Compare prices from verified repair shops near you.',
    type: 'referral',
    completed: false,
    subItems: [
      {
        id: 'r2a',
        title: 'Check warranty status',
        description: 'Verify if your device is still under manufacturer warranty.',
        type: 'info',
        completed: false,
        branch: 'left',
      },
      {
        id: 'r2b',
        title: 'Browse shops',
        description: 'Use the Connect module to find verified repair shops.',
        type: 'referral',
        completed: false,
        branch: 'right',
      },
    ],
  },
  {
    id: 'r3',
    title: 'Prepare your device',
    description: 'Remove accessories and note down your device condition.',
    type: 'action',
    completed: false,
    subItems: [
      {
        id: 'r3a',
        title: 'Remove case & screen protector',
        description: 'Take off any protective covers before handing over.',
        type: 'action',
        completed: false,
        branch: 'left',
      },
      {
        id: 'r3b',
        title: 'Document the issue',
        description: 'Take photos of the damage for your records.',
        type: 'info',
        completed: false,
        branch: 'right',
      },
    ],
  },
  {
    id: 'r4',
    title: 'Send for repair',
    description: 'Bring your device to the chosen repair shop.',
    type: 'action',
    completed: false,
    subItems: [
      {
        id: 'r4a',
        title: 'Ask about repair warranty',
        description: 'Confirm if the shop offers a warranty on their work.',
        type: 'info',
        completed: false,
        branch: 'left',
      },
      {
        id: 'r4b',
        title: 'Get a receipt',
        description: 'Always keep proof of the transaction and repair terms.',
        type: 'action',
        completed: false,
        branch: 'right',
      },
    ],
  },
]

export const RECYCLE_STEPS: RoadmapStep[] = [
  {
    id: 'c1',
    title: 'Back up your data',
    description: 'Save anything you want to keep before wiping.',
    type: 'action',
    completed: false,
    recommended: true,
    subItems: [
      {
        id: 'c1a',
        title: 'Photo & video backup',
        description: 'Transfer media to a computer or cloud storage.',
        type: 'action',
        completed: false,
        branch: 'left',
      },
      {
        id: 'c1b',
        title: 'Contact & calendar sync',
        description: 'Ensure contacts and events are synced to your account.',
        type: 'info',
        completed: false,
        branch: 'right',
      },
    ],
  },
  {
    id: 'c2',
    title: 'Wipe your data',
    description: 'Factory reset and remove all personal accounts.',
    type: 'download',
    completed: false,
    subItems: [
      {
        id: 'c2a',
        title: 'Sign out of accounts',
        description: 'Remove Google, Apple, and Samsung accounts from the device.',
        type: 'action',
        completed: false,
        branch: 'left',
      },
      {
        id: 'c2b',
        title: 'Factory reset',
        description: 'Perform a full factory reset to erase all data permanently.',
        type: 'action',
        completed: false,
        branch: 'right',
      },
    ],
  },
  {
    id: 'c3',
    title: 'Remove physical items',
    description: 'Take out SIM, SD cards, and removable accessories.',
    type: 'action',
    completed: false,
    subItems: [
      {
        id: 'c3a',
        title: 'Eject SIM card',
        description: 'Use the SIM tool or a paperclip to remove the SIM tray.',
        type: 'action',
        completed: false,
        branch: 'left',
      },
      {
        id: 'c3b',
        title: 'Remove SD card & case',
        description: 'Take out any memory cards and protective cases.',
        type: 'action',
        completed: false,
        branch: 'right',
      },
    ],
  },
  {
    id: 'c4',
    title: 'Find a drop-off point',
    description: 'Locate a verified recycling facility or e-waste center.',
    type: 'referral',
    completed: false,
    subItems: [
      {
        id: 'c4a',
        title: 'Check DENR facilities',
        description: 'Browse DENR-accredited TSD facilities in your area.',
        type: 'info',
        completed: false,
        branch: 'left',
      },
      {
        id: 'c4b',
        title: 'Browse drop-off points',
        description: 'Use the Connect module to find e-waste collection points.',
        type: 'referral',
        completed: false,
        branch: 'right',
      },
    ],
  },
]

export function getRoadmapSteps(direction: 'REPAIR' | 'RECYCLE'): RoadmapStep[] {
  return direction === 'REPAIR' ? [...REPAIR_STEPS] : [...RECYCLE_STEPS]
}
