import type { RegisterDto, User, UserCredentials } from '@/types'

export interface AuthResult {
  user: User
  token: string
}

export interface IAuthService {
  login(credentials: UserCredentials): Promise<AuthResult>
  register(dto: RegisterDto): Promise<AuthResult>
  logout(accessToken?: string | null): Promise<void>
  getCurrentUser(token: string): Promise<User | null>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(token: string, password: string): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  updateProfile(fullName: string): Promise<User>
  sendEmailVerification(): Promise<void>
  confirmEmailVerification(token: string): Promise<User>
  loginWithGoogle(idToken: string): Promise<AuthResult>
}
