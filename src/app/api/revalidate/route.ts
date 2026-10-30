
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Это наш "секретный пароль". Придумайте что-то сложное, как пароль от сейфа.
// Например: "supersecret2026"
const SECRET_TOKEN = "Yjdbxjr_1803!"

export async function POST(request: NextRequest) {
  // 1. Проверяем, правильный ли пароль пришел от нас
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('secret')

  if (token !== SECRET_TOKEN) {
    // Если пароль неверный — возвращаем ошибку 401 (как "доступ запрещен")
    return NextResponse.json({ message: 'Неверный секретный ключ!' }, { status: 401 })
  }

  // 2. Если пароль верный — говорим серверу пересобрать ВСЕ страницы
  // (слово "/" означает "пересобрать всё")
  revalidatePath('/', 'layout')

  // 3. Отвечаем, что всё прошло успешно
  return NextResponse.json({ 
    revalidated: true, 
    message: 'Карта сайта успешно обновлена! 🌟' 
  })
}
