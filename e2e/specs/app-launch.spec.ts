import { byText } from '../helpers/selectors'

describe('Lumiere App Launch', () => {
  it('should launch the app successfully', async () => {
    // Wait for the app to be ready - onboarding screen should appear
    const gatewayUrlLabel = await $(byText('Gateway URL'))
    await gatewayUrlLabel.waitForDisplayed({ timeout: 30000 })
  })

  it('should display the onboarding screen with required fields', async () => {
    // Verify Gateway URL field is present
    const gatewayUrlLabel = await $(byText('Gateway URL'))
    await expect(gatewayUrlLabel).toBeDisplayed()

    // Verify Gateway Token field is present
    const gatewayTokenLabel = await $(byText('Gateway Token'))
    await expect(gatewayTokenLabel).toBeDisplayed()

    // Verify Get Started button is present
    const getStartedButton = await $(byText('Get Started'))
    await expect(getStartedButton).toBeDisplayed()
  })

  it('should display the Advanced section toggle', async () => {
    const advancedToggle = await $(byText('Advanced'))
    await expect(advancedToggle).toBeDisplayed()
  })
})
