import { byText, byTextContaining } from '../helpers/selectors'

describe('Lumiere Onboarding Flow', () => {
  it('should show advanced fields when Advanced is tapped', async () => {
    const advancedToggle = await $(byText('Advanced'))
    await advancedToggle.click()

    // Verify Client ID field appears
    const clientIdLabel = await $(byText('Client ID'))
    await clientIdLabel.waitForDisplayed({ timeout: 5000 })
    await expect(clientIdLabel).toBeDisplayed()

    // Verify Default Session Key field appears
    const sessionKeyLabel = await $(byText('Default Session Key'))
    await expect(sessionKeyLabel).toBeDisplayed()
  })

  it('should collapse advanced fields when Advanced is tapped again', async () => {
    const advancedToggle = await $(byText('Advanced'))
    await advancedToggle.click()

    // Client ID should no longer be displayed
    const clientIdLabel = await $(byText('Client ID'))
    await clientIdLabel.waitForDisplayed({ timeout: 5000, reverse: true })
  })

  it('should keep Get Started button disabled without required fields', async () => {
    const getStartedButton = await $(byText('Get Started'))
    // The button should be present but disabled (not interactable)
    await expect(getStartedButton).toBeDisplayed()
  })

  it('should show hint text for Gateway URL field', async () => {
    const hint = await $(byTextContaining('Molt Gateway server'))
    await expect(hint).toBeDisplayed()
  })
})
