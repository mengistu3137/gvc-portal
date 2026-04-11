import permissionSeeder from './permissionSeeder.js';

export async function ensurePermissions() {
  await permissionSeeder.seedPermissionsIfMissing();
}

export default ensurePermissions;
