import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const ADMIN_EMAIL = 'admin@clinique.com';
const ADMIN_PASSWORD = 'password123';
const DOCTOR_EMAIL = 'doctor@clinique.com';
const STAFF_EMAIL = 'staff@clinique.com';

async function login(
  page: import('@playwright/test').Page,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD
) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000, waitUntil: 'domcontentloaded' });
}

test.describe('Visual UI — Nezha Clinical OS', () => {
  test('login page — light clinical split layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const grid = page.getByTestId('login-split-grid');
    await expect(grid).toBeVisible();
    await expect(page.getByRole('complementary').getByText('Nezha Medical')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'login-desktop.png'),
      fullPage: false,
    });
  });

  test('dashboard admin — clinical workflow', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /pilotage du cabinet/i })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-admin.png'),
      fullPage: true,
    });
  });

  test('dashboard doctor — clinical workflow', async ({ page }) => {
    await login(page, DOCTOR_EMAIL);
    await page.goto('/dashboard/doctor');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-doctor.png'),
      fullPage: true,
    });
  });

  test('dashboard assistant — clinical workflow', async ({ page }) => {
    await login(page, STAFF_EMAIL);
    await page.goto('/dashboard/assistant');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/assistant/);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-assistant.png'),
      fullPage: true,
    });
  });

  test('dashboard home — operational overview', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const onAdmin = page.url().includes('/dashboard/admin');
    if (onAdmin) {
      await expect(page.getByRole('heading', { name: /pilotage du cabinet/i })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /accueil/i })).toBeVisible();
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-home.png'),
      fullPage: true,
    });
  });

  test('patients page — data table shell', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/patients');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /dossiers médicaux/i })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'patients.png'),
      fullPage: true,
    });
  });

  test('invoices page — billing table', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.getByRole('heading', { name: /facturation/i })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'invoices.png'),
      fullPage: true,
    });
  });

  test('mobile — login responsive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'login-mobile.png'),
      fullPage: true,
    });
  });

  test('mobile — dashboard nav', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/dashboard/patients');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'patients-mobile.png'),
      fullPage: true,
    });
  });
});
