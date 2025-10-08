import { test, expect } from '@playwright/test'

test.describe('Yarnli-CAD Application', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/CrochetCAD|Yarnli/i)
  })

  test('should navigate to editor', async ({ page }) => {
    await page.goto('/')
    
    // Look for a link or button to the editor
    // Adjust selector based on your actual UI
    const editorLink = page.locator('a[href*="editor"], button:has-text("Editor")')
    
    if (await editorLink.count() > 0) {
      await editorLink.first().click()
      await page.waitForURL(/.*editor.*/)
      
      // Verify we're on the editor page
      expect(page.url()).toContain('editor')
    }
  })

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check for basic accessibility
    const main = page.locator('main, [role="main"], #root')
    await expect(main).toBeVisible()
  })
})

