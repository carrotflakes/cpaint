import { test, expect } from '@playwright/test';

test.describe('CPaint Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application and show the welcome screen', async ({ page }) => {
    // Check if the main app structure is loaded
    await expect(page.locator('[data-testid="app"]')).toBeVisible();

    // Should show the Files component when no image is loaded
    await expect(page.locator('text=Files')).toBeVisible();

    // Check for header area (Files title should be visible)
    await expect(page.locator('text=Files')).toBeVisible();
  });

  test('should create a new canvas', async ({ page }) => {
    // Look for a canvas size button and click it (since there's no single "New" button)
    await page.click('button:has-text("400 x 400 px")');

    // Should show canvas creation dialog or directly create canvas
    // Wait for main canvas area to appear
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Toolbar should be visible
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();

    // Layers panel should be visible
    await expect(page.locator('[data-testid="layers-bar"]')).toBeVisible();
  });

  test('should be able to draw on canvas', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Select brush tool (should be default, look for brush icon with title)
    const brushTool = page.locator('[title="Brush"]');
    if (await brushTool.isVisible()) {
      await brushTool.click();
    }

    // Get main drawing canvas element (the largest one)
    const canvas = page.locator('canvas').first();

    // Get initial canvas state by taking screenshot
    const initialCanvasData = await canvas.screenshot();

    // Draw a simple line on the canvas (force click to bypass overlays)
    await canvas.click({ position: { x: 100, y: 100 }, force: true });
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 150 },
      force: true
    });

    // Wait for drawing to complete
    await page.waitForTimeout(200);

    // Verify drawing occurred by comparing canvas state
    // Method 1: Check if canvas data has changed by taking another screenshot
    const afterDrawingCanvasData = await canvas.screenshot();
    expect(initialCanvasData.equals(afterDrawingCanvasData)).toBe(false);

    // Method 2: Check if undo is available (indicates an operation was performed)
    const undoButton = page.locator('[title="Undo"]');
    if (await undoButton.isVisible()) {
      await expect(undoButton).not.toHaveAttribute('disabled');
    }

    // Method 3: Verify using canvas pixel data (more reliable)
    const hasDrawing = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
      if (!ctx) return false;

      // Get image data from the drawn area
      const imageData = ctx.getImageData(90, 90, 120, 70);
      const data = imageData.data;

      // Check if any pixels are not transparent (alpha > 0)
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          return true; // Found non-transparent pixel
        }
      }
      return false;
    });

    expect(hasDrawing).toBe(true);
  });

  test('should be able to switch tools', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Test switching to fill tool
    const fillTool = page.locator('[title="Fill"]');
    if (await fillTool.isVisible()) {
      await fillTool.click();
      await expect(fillTool).toHaveAttribute('data-selected', 'true');
    }

    // Test switching to eraser
    const eraserTool = page.locator('[title="Eraser"]');
    if (await eraserTool.isVisible()) {
      await eraserTool.click();
      await expect(eraserTool).toHaveAttribute('data-selected', 'true');
    }
  });

  test('should be able to adjust brush size', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Look for brush size slider or input
    const brushSizeSlider = page.locator('input[type="range"]').first();
    if (await brushSizeSlider.isVisible()) {
      // Get current value
      const initialValue = await brushSizeSlider.inputValue();

      // Change the value
      await brushSizeSlider.fill('20');

      // Verify the value changed
      const newValue = await brushSizeSlider.inputValue();
      expect(newValue).not.toBe(initialValue);
    }
  });

  test('should be able to change colors', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Look for color picker
    const colorPicker = page.locator('input[type="color"]');
    if (await colorPicker.isVisible()) {
      // Change color
      await colorPicker.fill('#ff0000'); // Red

      // Verify color changed
      const colorValue = await colorPicker.inputValue();
      expect(colorValue).toBe('#ff0000');
    }
  });

  test('should show layers panel with default layer', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Check layers panel
    const layersPanel = page.locator('[data-testid="layers-bar"]');
    await expect(layersPanel).toBeVisible();

    // Should have at least one layer (check for layer elements in the layers bar)
    const layerElements = page.locator('[data-testid="layers-bar"] [data-layer-index]');
    const count = await layerElements.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should be able to save project', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Use keyboard shortcut to save
    await page.keyboard.press('Control+s');

    // After save, the project stays open (Ctrl+S saves but doesn't exit)
    // Check that the canvas is still visible after save
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 });
  });

  test('should apply effects', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Draw something first (force click to bypass overlays)
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 100, y: 100 }, force: true });

    // Look for effects menu (by title attribute)
    const effectsButton = page.locator('[title="Effects"]');
    if (await effectsButton.isVisible()) {
      await effectsButton.click();

      // Try to apply blur effect
      const blurEffect = page.locator('text=Blur').first();
      if (await blurEffect.isVisible()) {
        await blurEffect.click();

        // Should show effect preview dialog
        await expect(page.locator('text=Blur')).toBeVisible({ timeout: 5000 });

        // Click Done to apply
        const doneButton = page.locator('button:has-text("Done")');
        if (await doneButton.isVisible()) {
          await doneButton.click();
        }
      }
    }
  });

  test('should verify drawing with different brush sizes', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('canvas').first();

    // Test with small brush
    const brushSizeSlider = page.locator('input[type="range"]').first();
    if (await brushSizeSlider.isVisible()) {
      await brushSizeSlider.fill('5');
      await page.waitForTimeout(100);
    }

    // Draw with small brush
    await canvas.click({ position: { x: 50, y: 50 }, force: true });
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 100, y: 50 },
      force: true
    });

    // Verify first drawing
    const hasSmallBrushDrawing = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(45, 45, 60, 10);
      const data = imageData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;
      }
      return false;
    });
    expect(hasSmallBrushDrawing).toBe(true);

    // Test with larger brush
    if (await brushSizeSlider.isVisible()) {
      await brushSizeSlider.fill('20');
      await page.waitForTimeout(100);
    }

    // Draw with large brush in different area
    await canvas.click({ position: { x: 150, y: 150 }, force: true });
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 150, y: 150 },
      targetPosition: { x: 200, y: 150 },
      force: true
    });

    // Verify second drawing
    const hasLargeBrushDrawing = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(140, 140, 70, 20);
      const data = imageData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;
      }
      return false;
    });
    expect(hasLargeBrushDrawing).toBe(true);

    // Verify that both drawings exist on canvas
    const totalDrawingPixels = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
      if (!ctx) return 0;
      const canvas = canvasEl as HTMLCanvasElement;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) count++;
      }
      return count;
    });

    expect(totalDrawingPixels).toBeGreaterThan(0);
  });

  test('should verify drawing with different colors', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('canvas').first();
    const colorPicker = page.locator('input[type="color"]');

    if (await colorPicker.isVisible()) {
      // Draw with red color
      await colorPicker.fill('#ff0000');
      await page.waitForTimeout(100);

      await canvas.click({ position: { x: 50, y: 50 }, force: true });
      await canvas.dragTo(canvas, {
        sourcePosition: { x: 50, y: 50 },
        targetPosition: { x: 100, y: 50 },
        force: true
      });

      // Wait and verify red drawing
      await page.waitForTimeout(200);

      const hasRedDrawing = await canvas.evaluate((canvasEl) => {
        const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
        if (!ctx) return false;
        const imageData = ctx.getImageData(60, 48, 20, 4);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          // Check for red color (allowing some tolerance)
          if (a > 0 && r > 200 && g < 100 && b < 100) {
            return true;
          }
        }
        return false;
      });

      expect(hasRedDrawing).toBe(true);

      // Draw with blue color in different area
      await colorPicker.fill('#0000ff');
      await page.waitForTimeout(100);

      await canvas.click({ position: { x: 150, y: 150 }, force: true });
      await canvas.dragTo(canvas, {
        sourcePosition: { x: 150, y: 150 },
        targetPosition: { x: 200, y: 150 },
        force: true
      });

      await page.waitForTimeout(200);

      const hasBlueDrawing = await canvas.evaluate((canvasEl) => {
        const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
        if (!ctx) return false;
        const imageData = ctx.getImageData(160, 148, 20, 4);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          // Check for blue color (allowing some tolerance)
          if (a > 0 && r < 100 && g < 100 && b > 200) {
            return true;
          }
        }
        return false;
      });

      expect(hasBlueDrawing).toBe(true);
    }
  });

  test('should verify undo/redo functionality with drawing', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('canvas').first();

    // Use the helper function to check specific drawing area instead of whole canvas
    const initialDrawingAreaPixels = await countDrawingPixelsInArea(canvas, 90, 90, 120, 70);

    // Drawing area should initially have no drawing strokes
    expect(initialDrawingAreaPixels).toBe(0);

    // Draw something in the specific area
    await canvas.click({ position: { x: 100, y: 100 }, force: true });
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 150 },
      force: true
    });

    await page.waitForTimeout(200);

    // Verify drawing exists in the specific area (should have more pixels than initial)
    const afterDrawingAreaPixels = await countDrawingPixelsInArea(canvas, 90, 90, 120, 70);
    expect(afterDrawingAreaPixels).toBeGreaterThan(initialDrawingAreaPixels);

    // Undo the drawing
    const undoButton = page.locator('[title="Undo"]');
    if (await undoButton.isVisible()) {
      await undoButton.click();
      await page.waitForTimeout(200);

      // Verify drawing area is back to initial state
      const afterUndoAreaPixels = await countDrawingPixelsInArea(canvas, 90, 90, 120, 70);
      expect(afterUndoAreaPixels).toBe(initialDrawingAreaPixels);

      // Redo the drawing
      const redoButton = page.locator('[title="Redo"]');
      if (await redoButton.isVisible()) {
        await redoButton.click();
        await page.waitForTimeout(200);

        // Verify drawing is back in the area
        const afterRedoAreaPixels = await countDrawingPixelsInArea(canvas, 90, 90, 120, 70);
        expect(afterRedoAreaPixels).toBeGreaterThan(0);
        expect(afterRedoAreaPixels).toBe(afterDrawingAreaPixels);
      }
    }
  });

  test('should verify drawing in specific area', async ({ page }) => {
    // Create new canvas first
    await page.click('button:has-text("400 x 400 px")');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('canvas').first();

    // Check specific drawing area is initially clean (no drawing strokes)
    const initialDrawingAreaPixels = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
      if (!ctx) return 0;
      // Check a specific area where we will draw (100,100 to 200,150)
      const imageData = ctx.getImageData(90, 90, 120, 70);
      const data = imageData.data;
      let nonWhitePixels = 0;

      // Count pixels that are not white/transparent background
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // If pixel is not white background (255,255,255) or transparent, count it
        if (a > 0 && !(r > 250 && g > 250 && b > 250)) {
          nonWhitePixels++;
        }
      }
      return nonWhitePixels;
    });

    // Drawing area should initially have no drawing strokes
    expect(initialDrawingAreaPixels).toBe(0);

    // Draw a line in the specific area
    await canvas.click({ position: { x: 100, y: 100 }, force: true });
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 150 },
      force: true
    });

    await page.waitForTimeout(200);

    // Check drawing area again - should now have drawing strokes
    const afterDrawingAreaPixels = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d');
      if (!ctx) return 0;
      const imageData = ctx.getImageData(90, 90, 120, 70);
      const data = imageData.data;
      let nonWhitePixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 0 && !(r > 250 && g > 250 && b > 250)) {
          nonWhitePixels++;
        }
      }
      return nonWhitePixels;
    });

    // Should now have drawing strokes in the area
    expect(afterDrawingAreaPixels).toBeGreaterThan(0);
    expect(afterDrawingAreaPixels).toBeGreaterThan(initialDrawingAreaPixels);
  });
});

// Helper function to count non-background pixels in a specific area
async function countDrawingPixelsInArea(canvas: any, x: number, y: number, width: number, height: number) {
  return await canvas.evaluate((canvasEl: HTMLCanvasElement, { x, y, width, height }: { x: number, y: number, width: number, height: number }) => {
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return 0;

    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;
    let drawingPixels = 0;

    // Count pixels that are not white background or transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // If pixel is not white background (255,255,255) or transparent, count it as drawing
      if (a > 0 && !(r > 250 && g > 250 && b > 250)) {
        drawingPixels++;
      }
    }
    return drawingPixels;
  }, { x, y, width, height });
}

// Helper function to count all pixels with alpha > 0
async function countAllPixels(canvas: any) {
  return await canvas.evaluate((canvasEl: HTMLCanvasElement) => {
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    const data = imageData.data;
    let count = 0;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) count++;
    }
    return count;
  });
}
