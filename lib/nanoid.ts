// This is a simple implementation of nanoid for our project
// In a real project, you'd install the nanoid package

export function nanoid(size = 21) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  let id = ""
  for (let i = 0; i < size; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return id
}
