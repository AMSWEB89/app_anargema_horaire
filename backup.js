const fs = require('fs');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup_${timestamp}`;

  // Create backup directory
  fs.mkdirSync(backupDir);

  // Copy project files
  execSync(`cp -r src ${backupDir}/`);
  execSync(`cp -r public ${backupDir}/`);
  execSync(`cp -r supabase ${backupDir}/`);
  execSync(`cp package.json ${backupDir}/`);
  execSync(`cp package-lock.json ${backupDir}/`);
  execSync(`cp vite.config.ts ${backupDir}/`);
  execSync(`cp tsconfig.json ${backupDir}/`);
  execSync(`cp tsconfig.node.json ${backupDir}/`);
  execSync(`cp tsconfig.app.json ${backupDir}/`);
  execSync(`cp tailwind.config.js ${backupDir}/`);
  execSync(`cp postcss.config.js ${backupDir}/`);
  execSync(`cp .env ${backupDir}/`);

  // Export database data
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const tables = [
    'departments',
    'employees',
    'userapplication',
    'employee_schedules',
    'employee_attendance'
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*');
    
    if (error) {
      console.error(`Error exporting ${table}:`, error);
      continue;
    }

    fs.writeFileSync(
      `${backupDir}/${table}.json`,
      JSON.stringify(data, null, 2)
    );
  }

  // Create zip archive
  execSync(`zip -r ${backupDir}.zip ${backupDir}`);
  execSync(`rm -rf ${backupDir}`);

  console.log(`Backup created successfully: ${backupDir}.zip`);
}

createBackup().catch(console.error);