"use server"

import { signIn } from "@/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"

export async function signup(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string

  if (!email || !password || password.length < 8) {
    throw new Error("Ogiltiga uppgifter")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error("E-postadressen används redan")

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({ data: { email, passwordHash, name } })

  await signIn("credentials", { email, password, redirectTo: "/dashboard" })
}

export async function login(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error("Fel e-post eller lösenord")
    }
    throw error
  }
}
