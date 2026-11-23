export * from './types.js';
export * from './storage/atomic-fs.js';
export * from './storage/lock.js';
export * from './governance/permissions.js';
export * from './ledger/categories.js';
export * from './ledger/intelligence-ledger.js';
export * from './ledger/exporters.js';
export * from './budget/pricing.js';
export * from './budget/budget-controller.js';
export * from './checkpoints/checkpoint-store.js';
export * from './tasks/delegation.js';
export * from './tasks/task-store.js';
export * from './tasks/stage-machine.js';

import { resolveDataDir } from './storage/atomic-fs.js';
import { GovernanceGuard } from './governance/permissions.js';
import { IntelligenceLedger } from './ledger/intelligence-ledger.js';
import { BudgetController } from './budget/budget-controller.js';
import { CheckpointStore } from './checkpoints/checkpoint-store.js';
import { TaskManager } from './tasks/task-store.js';
import { StageMachine } from './tasks/stage-machine.js';
import { LedgerExporter } from './ledger/exporters.js';

export interface AgentCenter {
  dataDir: string;
  governance: GovernanceGuard;
  ledger: IntelligenceLedger;
  budget: BudgetController;
  checkpoints: CheckpointStore;
  tasks: TaskManager;
  stages: StageMachine;
  exporters: LedgerExporter;
}

export function createAgentCenter(options?: { dataDir?: string | undefined }): AgentCenter {
  const dataDir = resolveDataDir(options?.dataDir);
  const governance = new GovernanceGuard(dataDir);
  const ledger = new IntelligenceLedger(dataDir, governance);
  const budget = new BudgetController(dataDir, ledger);
  const checkpoints = new CheckpointStore(dataDir, ledger, governance);
  const tasks = new TaskManager(dataDir, { ledger, budget, governance });
  const stages = new StageMachine(dataDir, { checkpoints, governance, ledger });
  const exporters = new LedgerExporter(dataDir, { ledger, budget, governance });

  return {
    dataDir,
    governance,
    ledger,
    budget,
    checkpoints,
    tasks,
    stages,
    exporters,
  };
}
