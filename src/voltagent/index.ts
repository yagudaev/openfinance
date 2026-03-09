import { AgentRegistry, VoltOpsClient } from '@voltagent/core'

export { agent } from './agents'

// Register VoltOpsClient globally so the agent's LazyRemoteExportProcessor
// exports OTel traces to VoltOps cloud. Without this, traces only go to
// the local WebSocket dev server. The VoltAgent server class does this
// automatically, but the Next.js app uses the agent directly.
if (process.env.VOLTAGENT_PUBLIC_KEY && process.env.VOLTAGENT_SECRET_KEY) {
  const registry = AgentRegistry.getInstance()
  if (!registry.getGlobalVoltOpsClient()) {
    registry.setGlobalVoltOpsClient(
      new VoltOpsClient({
        publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
        secretKey: process.env.VOLTAGENT_SECRET_KEY,
      }),
    )
  }
}
