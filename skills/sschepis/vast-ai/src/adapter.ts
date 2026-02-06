import { VastClient } from './VastClient'

export const VastSkill = {
  name: 'vast_ai_management',
  description: 'Rent and manage GPU instances on VAST.ai',

  // The agent calls this to initialize the client
  async execute(action: string, params: any, context: any) {
    const client = new VastClient(context.API_KEY)

    switch (action) {
      case 'search':
        // params: { gpu: string, price: number }
        return await client.findGpu(params.gpu, params.price)

      case 'rent':
        // params: { id: number, image: string }
        return await client.rent(params.id, params.image)

      case 'connect':
        // params: { id: number }
        return await client.getSshDetails(params.id)

      case 'balance':
        const account = await client.getBalance()
        // We need to list instances to calculate burn rate
        const listRes = await client.rawApi.listInstances()
        const instances = listRes.instances || []
        const burnRate = instances.reduce((acc: number, i: any) => acc + (i.dph_total || 0), 0)

        return {
          remainingCredit: `$${Number(account.credit).toFixed(2)}`,
          currentHourlyBurn: `$${burnRate.toFixed(2)}/hr`,
          estimatedRunTime:
            burnRate > 0 ? `${(account.credit / burnRate).toFixed(1)} hours` : 'Infinite',
        }

      default:
        throw new Error(`Action '${action}' not supported`)
    }
  },
}
