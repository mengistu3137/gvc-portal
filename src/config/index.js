import seeder from './seed.js';

async function runSeeder() {
  try {
    const shouldTruncate = process.argv.includes('--truncate');
    
    if (shouldTruncate) {
      await seeder.truncateAll();
    }
    
    await seeder.seedAll();
    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

runSeeder();