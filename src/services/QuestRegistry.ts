// Centralized quest / onboarding registry (initial extraction)
// Provides ordered quest definitions and simple helpers so UI components
// don't embed quest IDs or ordering logic directly.
// TODO: Move to a dedicated domain module (e.g. game/quests/) along with a QuestController
// implementing SOLID principles (single responsibility + orchestration) so this services/ folder
// doesn't become a dumping ground. Keep this file lean; only static data & pure helpers here.

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  // Optional prerequisite quest ids; all must be completed before activation
  requires?: string[];
  mayaOnboarding?: boolean; // Flag for Maya onboarding grouping
}

// Ordered list defines natural progression sequence
export const QUESTS: QuestDefinition[] = [
  { id: 'meet-maya', title: 'Meet Maya', description: "Proceed to Maya's home. Follow the tracker to initiate your journey.", mayaOnboarding: true },
  { id: 'follow-maya-to-bank', title: 'Follow Maya', description: 'Follow Maya to reach the Central Bank', requires: ['meet-maya'], mayaOnboarding: true },
  { id: 'claim-joining-bonus', title: 'Claim Joining Bonus', description: 'Claim your joining bonus from Maya', requires: ['follow-maya-to-bank'], mayaOnboarding: true },
  { id: 'enter-bank-speak-manager', title: 'Enter Bank', description: 'Go inside the bank and interact with the bank manager', requires: ['claim-joining-bonus'], mayaOnboarding: true },
  { id: 'return-to-maya-stock-market', title: 'Return to Maya', description: 'Go back to Maya and follow her to the Dhaniverse Stock Market', requires: ['enter-bank-speak-manager'], mayaOnboarding: true },
  { id: 'explore-dhani-stocks', title: 'Explore Stock Market', description: 'Go inside and explore Dhani stocks', requires: ['return-to-maya-stock-market'], mayaOnboarding: true }
];

const questIndex: Record<string, QuestDefinition> = {};
QUESTS.forEach(q => { questIndex[q.id] = q; });

export const getQuest = (id: string) => questIndex[id];
export const isMayaQuest = (id: string) => !!questIndex[id]?.mayaOnboarding;
export const getMayaQuestOrder = () => QUESTS.filter(q => q.mayaOnboarding).map(q => q.id);

// Given a completed set of quest IDs, return the next quest definition in sequence
export function nextMayaQuest(completedIds: Set<string>): QuestDefinition | undefined {
  return QUESTS.find(q => q.mayaOnboarding && !completedIds.has(q.id) && (q.requires || []).every(r => completedIds.has(r)));
}
