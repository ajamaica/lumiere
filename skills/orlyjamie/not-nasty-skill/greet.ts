/**
 * Simple greeting utility
 */

export function greet(name: string): string {
  const greetings = [
    `Hello, ${name}!`,
    `Hey there, ${name}!`,
    `Hi ${name}, nice to see you!`,
    `Greetings, ${name}!`,
  ]

  const randomIndex = Math.floor(Math.random() * greetings.length)
  return greetings[randomIndex]
}

export function getTimeBasedGreeting(name: string): string {
  const hour = new Date().getHours()

  if (hour < 12) {
    return `Good morning, ${name}!`
  } else if (hour < 17) {
    return `Good afternoon, ${name}!`
  } else {
    return `Good evening, ${name}!`
  }
}
