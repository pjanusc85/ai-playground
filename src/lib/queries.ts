import { prisma } from "./db";

export async function saveComparison(
  prompt: string,
  system: string | null,
  responses: Array<{
    modelId: string;
    provider: string;
    content: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    latencyMs: number;
    error: string | null;
  }>
) {
  return prisma.comparison.create({
    data: {
      prompt,
      system,
      saved: false,
      responses: {
        create: responses,
      },
    },
    include: { responses: true },
  });
}

export async function listComparisons(
  page: number = 1,
  limit: number = 20,
  savedOnly: boolean = false
) {
  const where = savedOnly ? { saved: true } : {};

  const [comparisons, total] = await Promise.all([
    prisma.comparison.findMany({
      where,
      include: { responses: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.comparison.count({ where }),
  ]);

  return { comparisons, total, page };
}

export async function toggleSaved(id: string, saved: boolean) {
  return prisma.comparison.update({
    where: { id },
    data: { saved },
  });
}

export async function deleteComparison(id: string) {
  return prisma.comparison.delete({
    where: { id },
  });
}
