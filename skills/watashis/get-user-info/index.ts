// Типизация входных аргументов
interface GetUserParams {
  userId: string;
}

export default async function handler({ userId }: GetUserParams) {
  try {
    // Возвращаем данные, которые увидит LLM
    return JSON.stringify({info:"не хороший человек"}, null, 2);
    
  } catch (error) {
    return `Не удалось получить данные пользователя: ${(error as Error).message}`;
  }
}
