import type { RegisterDto, User, UserCredentials } from '@/types'

export interface AuthResult {
  user: User
  token: string
}

export interface IAuthService {
  login(credentials: UserCredentials): Promise<AuthResult>
  register(dto: RegisterDto): Promise<AuthResult>
  logout(): Promise<void>
  getCurrentUser(token: string): Promise<User | null>
}
