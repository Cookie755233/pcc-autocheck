import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

//@ Initialize Prisma client
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log(chalk.blue.bold('\n=== SUBSCRIPTION DEBUG INFO ===\n'));
  
  try {
    //? Fetch all users
    const users = await prisma.$queryRaw`
      SELECT id, email, "subscriptionTier", "subscriptionId", "subscriptionStatus", "createdAt", "updatedAt"
      FROM "users"
      ORDER BY "createdAt" DESC
    `;
    
    console.log(chalk.green.bold('USERS:'));
    if (Array.isArray(users) && users.length > 0) {
      users.forEach((user: any, index: number) => {
        console.log(chalk.white.bold(`\nUser ${index + 1}:`));
        console.log(chalk.cyan('ID:'), user.id);
        console.log(chalk.cyan('Email:'), user.email);
        console.log(chalk.cyan('Subscription Tier:'), user.subscriptionTier);
        console.log(chalk.cyan('Subscription ID:'), user.subscriptionId || 'null');
        console.log(chalk.cyan('Subscription Status:'), user.subscriptionStatus || 'null');
        console.log(chalk.cyan('Created At:'), user.createdAt);
        console.log(chalk.cyan('Updated At:'), user.updatedAt);
      });
    } else {
      console.log(chalk.yellow(' No users found'));
    }

    //? Fetch all PayPal plans
    const plans = await prisma.$queryRaw`
      SELECT * FROM "paypal_plans"
      ORDER BY "createdAt" DESC
    `;
    
    console.log(chalk.green.bold('\nPAYPAL PLANS:'));
    if (Array.isArray(plans) && plans.length > 0) {
      plans.forEach((plan: any, index: number) => {
        console.log(chalk.white.bold(`\nPlan ${index + 1}:`));
        console.log(chalk.cyan('ID:'), plan.id);
        console.log(chalk.cyan('Plan ID:'), plan.planId);
        console.log(chalk.cyan('Product ID:'), plan.productId);
        console.log(chalk.cyan('Name:'), plan.name);
        console.log(chalk.cyan('Price:'), `${plan.price} ${plan.currency}`);
        console.log(chalk.cyan('Interval:'), plan.interval);
        console.log(chalk.cyan('Created At:'), plan.createdAt);
      });
    } else {
      console.log(chalk.yellow(' No PayPal plans found'));
    }
    
    console.log(chalk.blue.bold('\n=== END OF DEBUG INFO ===\n'));
  } catch (error) {
    console.error(chalk.red.bold('Error in debug script:'), error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error(chalk.red.bold('Script execution error:'), e);
    process.exit(1);
  }); 