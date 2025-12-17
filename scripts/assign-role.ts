/**
 * Assign Role to User Script
 *
 * This script assigns a role to a user.
 *
 * Usage:
 *   npx tsx scripts/assign-role.ts --email=user@example.com --role=admin
 *   npx tsx scripts/assign-role.ts --user-id=user-id-here --role=editor
 *   npx tsx scripts/assign-role.ts --email=user@example.com --role=viewer --expires-days=30
 */

import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import {
  assignRoleToUser,
  getRoleByName,
  getUserRoles,
} from '@/shared/services/rbac';

async function assignRole() {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const userIdArg = args.find((arg) => arg.startsWith('--user-id='));
  const roleArg = args.find((arg) => arg.startsWith('--role='));
  const expiresDaysArg = args.find((arg) => arg.startsWith('--expires-days='));

  if ((!emailArg && !userIdArg) || !roleArg) {
    console.error('❌ Error: Please provide user identifier and role');
    console.log('\nUsage:');
    console.log(
      '  npx tsx scripts/assign-role.ts --email=user@example.com --role=admin'
    );
    console.log(
      '  npx tsx scripts/assign-role.ts --user-id=user-id-here --role=editor'
    );
    console.log(
      '  npx tsx scripts/assign-role.ts --email=user@example.com --role=viewer --expires-days=30'
    );
    console.log('\nAvailable roles:');
    console.log('  - super_admin (full access)');
    console.log('  - admin (most permissions)');
    console.log('  - editor (content management)');
    console.log('  - viewer (read-only)');
    process.exit(1);
  }

  try {
    // Find user
    let targetUser;

    if (emailArg) {
      const email = emailArg.split('=')[1];
      console.log(`🔍 Looking up user by email: ${email}`);

      const [foundUser] = await db()
        .select()
        .from(user)
        .where(eq(user.email, email));

      targetUser = foundUser;
    } else if (userIdArg) {
      const userId = userIdArg.split('=')[1];
      console.log(`🔍 Looking up user by ID: ${userId}`);

      const [foundUser] = await db()
        .select()
        .from(user)
        .where(eq(user.id, userId));

      targetUser = foundUser;
    }

    if (!targetUser) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log(`✓ Found user: ${targetUser.name} (${targetUser.email})\n`);

    // Find role
    const roleName = roleArg.split('=')[1];
    console.log(`🔍 Looking up role: ${roleName}`);

    const role = await getRoleByName(roleName);

    if (!role) {
      console.error(`❌ Role not found: ${roleName}`);
      console.log('\nAvailable roles:');
      console.log('  - super_admin');
      console.log('  - admin');
      console.log('  - editor');
      console.log('  - viewer');
      console.log(
        "\nTip: Run 'npx tsx scripts/init-rbac.ts' to create default roles"
      );
      process.exit(1);
    }

    console.log(`✓ Found role: ${role.title}\n`);

    // Check if user already has this role
    const existingRoles = await getUserRoles(targetUser.id);
    const hasRole = existingRoles.some((r) => r.id === role.id);

    if (hasRole) {
      console.log(`ℹ️  User already has role: ${role.title}`);
      console.log('   No changes made.');
      process.exit(0);
    }

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresDaysArg) {
      const days = parseInt(expiresDaysArg.split('=')[1]);
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      console.log(`⏰ Role will expire on: ${expiresAt.toISOString()}\n`);
    }

    // Assign role
    console.log(`🔄 Assigning role to user...`);
    await assignRoleToUser(targetUser.id, role.id, expiresAt);

    console.log(`\n✅ Successfully assigned role!`);
    console.log(`\n📊 Summary:`);
    console.log(`   User: ${targetUser.name} (${targetUser.email})`);
    console.log(`   Role: ${role.title} (${role.name})`);
    if (expiresAt) {
      console.log(`   Expires: ${expiresAt.toISOString()}`);
    } else {
      console.log(`   Expires: Never`);
    }
    console.log('');

    console.log('💡 Next Steps:');
    console.log('   - User can now access features granted by this role');
    console.log(
      '   - Check user permissions: npx tsx scripts/check-user-permissions.ts --email=' +
        targetUser.email
    );
    console.log('');
  } catch (error) {
    console.error('\n❌ Error assigning role:', error);
    process.exit(1);
  }
}

// Run the assignment
assignRole()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
