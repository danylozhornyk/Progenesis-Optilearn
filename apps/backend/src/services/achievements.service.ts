import { prisma } from '../db/prisma';
import { AchievementCategory } from 'generated/prisma';

export function getAchievementsByUser(userId: string) {
  return prisma.achievement.findMany({
    where: { userId },
    orderBy: { awardedAt: 'desc' },
  });
}

export function awardAchievement(data: {
  userId: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconUrl?: string;
  pointsAwarded?: number;
}) {
  return prisma.achievement.upsert({
    where: { userId_code: { userId: data.userId, code: data.code } },
    update: {},
    create: data,
  });
}
