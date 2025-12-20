
import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import {
  createCredit,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  getRemainingCredits,
} from '@/shared/models/credit';
import { getSnowId, getUuid } from '@/shared/lib/hash';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const amountStr = args[1];

  if (!email || !amountStr) {
    console.error('Usage: pnpm tsx scripts/grant-credits.ts <email> <amount>');
    process.exit(1);
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    console.error('Invalid amount');
    process.exit(1);
  }

  // Find user
  const [targetUser] = await db().select().from(user).where(eq(user.email, email));

  if (!targetUser) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${targetUser.name} (${targetUser.id})`);
  console.log(`Current credits: ${await getRemainingCredits(targetUser.id)}`);

  // Grant credits
  await createCredit({
    id: getUuid(),
    userId: targetUser.id,
    userEmail: targetUser.email,
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.GIFT,
    credits: amount,
    remainingCredits: amount, // Full amount is remaining initially
    status: CreditStatus.ACTIVE,
    description: 'Manual grant via script',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Successfully granted ${amount} credits to ${email}`);
  console.log(`New balance: ${await getRemainingCredits(targetUser.id)}`);
  
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
